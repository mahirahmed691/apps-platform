import { runAnthropicPrompt } from '@/lib/aiClient';
import { getIndustryTemplate, type IndustryTemplate } from '@/lib/industryTemplates';
import { parseJsonLoose } from '@/lib/studioFeatures';
import type { CompanyProfile, CompanyDataSource } from '@/lib/companies';
import { companyRowToProfile, mergeUniqueTerms, resolveCompanyProfile, slugifyCompanyName } from '@/lib/companies';
import { resolveCompanyLogoUrl } from '@/lib/companyLogos';

export type EnrichCompanyInput = {
  name: string;
  industryId?: string;
  jobInput?: string;
};

export type EnrichedCompanyPayload = {
  name: string;
  industryId: string;
  summary: string;
  tooling: string[];
  domains: string[];
  methodologies: string[];
  rolePatterns: string[];
  hiringSignals: string;
};

export function buildCompanyEnrichPrompt(input: EnrichCompanyInput, industry?: IndustryTemplate): string {
  const industryBlock = industry
    ? [
        'Suggested industry context:',
        `Industry: ${industry.name}`,
        `Typical tooling: ${industry.tooling.join(', ')}`,
        `Typical domains: ${industry.domains.join(', ')}`,
      ].join('\n')
    : '';

  return `You are building a hiring profile for CV tailoring. Extract realistic employer signals from the input.
Respond with JSON only:
{"name":"...","industryId":"...","summary":"...","tooling":["..."],"domains":["..."],"methodologies":["..."],"rolePatterns":["..."],"hiringSignals":"..."}

Rules:
- Use only plausible public knowledge — do not invent confidential details.
- industryId must be one of: fintech, healthcare, consulting, retail-ecommerce, media-entertainment, public-sector, energy, legal, education, manufacturing, telecom, marketplace-logistics
- Keep arrays concise (4-10 items each). UK/EU employers preferred when relevant.
- hiringSignals: one sentence on what recruiters at this employer typically value.

Company name: ${input.name.trim()}
${industryBlock}
${input.jobInput?.trim() ? `\nAdditional context (job posting or notes):\n${input.jobInput.trim().slice(0, 10000)}` : ''}`;
}

export async function enrichCompanyFromInput(input: EnrichCompanyInput): Promise<EnrichedCompanyPayload> {
  const industry = input.industryId ? getIndustryTemplate(input.industryId) : undefined;
  let enrichedContext = input.jobInput?.trim() ?? '';

  if (enrichedContext && /^https?:\/\//i.test(enrichedContext)) {
    try {
      const response = await fetch(enrichedContext, {
        headers: { 'User-Agent': 'CeevieBot/1.0' },
        signal: AbortSignal.timeout(8000),
      });
      if (response.ok) {
        const html = await response.text();
        enrichedContext = `${enrichedContext}\n\n${html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 8000)}`;
      }
    } catch {
      // use URL only
    }
  }

  const raw = await runAnthropicPrompt(
    buildCompanyEnrichPrompt({ ...input, jobInput: enrichedContext || input.jobInput }, industry),
    1200
  );
  const parsed = parseJsonLoose<EnrichedCompanyPayload>(raw);
  if (!parsed?.name?.trim()) {
    throw new Error('Could not enrich company profile');
  }

  const template = getIndustryTemplate(parsed.industryId || input.industryId || 'consulting');
  return {
    name: parsed.name.trim(),
    industryId: parsed.industryId || input.industryId || template?.id || 'consulting',
    summary: parsed.summary?.trim() || template?.summary || `${parsed.name.trim()} employer profile.`,
    tooling: mergeUniqueTerms(parsed.tooling, template?.tooling),
    domains: mergeUniqueTerms(parsed.domains, template?.domains),
    methodologies: mergeUniqueTerms(parsed.methodologies, template?.methodologies),
    rolePatterns: mergeUniqueTerms(parsed.rolePatterns, template?.rolePatterns),
    hiringSignals: parsed.hiringSignals?.trim() || template?.hiringSignals || 'Values relevant experience and clear impact evidence.',
  };
}

export function enrichedPayloadToProfile(payload: EnrichedCompanyPayload, existingId?: string): CompanyProfile {
  const slug = slugifyCompanyName(payload.name);
  const industry = getIndustryTemplate(payload.industryId);
  const base = {
    id: existingId ?? slug,
    name: payload.name,
    slug,
    logoUrl: '',
    accentColor: industry?.accentColor ?? '#64748b',
    industryId: payload.industryId,
    dataSource: 'enriched' as CompanyDataSource,
    region: 'uk',
    isFeatured: false,
    summary: payload.summary,
    tooling: payload.tooling,
    domains: payload.domains,
    methodologies: payload.methodologies,
    rolePatterns: payload.rolePatterns,
    hiringSignals: payload.hiringSignals,
  };
  return {
    ...base,
    logoUrl: resolveCompanyLogoUrl(base) ?? '',
  };
}

export function profileToDbRow(profile: CompanyProfile, userId?: string) {
  return {
    id: profile.id,
    name: profile.name,
    slug: profile.slug,
    logo_url: profile.logoUrl,
    accent_color: profile.accentColor,
    industry_id: profile.industryId,
    data_source: profile.dataSource,
    region: profile.region,
    is_featured: profile.isFeatured,
    summary: profile.summary,
    tooling: profile.tooling,
    domains: profile.domains,
    methodologies: profile.methodologies,
    role_patterns: profile.rolePatterns,
    hiring_signals: profile.hiringSignals,
    last_verified_at: new Date().toISOString(),
    created_by_user_id: userId ?? null,
  };
}

export function isProfileStale(row: Record<string, unknown>, maxAgeDays = 30): boolean {
  const verified = typeof row.last_verified_at === 'string' ? Date.parse(row.last_verified_at) : NaN;
  if (Number.isNaN(verified)) return true;
  return Date.now() - verified > maxAgeDays * 24 * 60 * 60 * 1000;
}

export async function findCachedCompany(
  db: { from: (table: string) => any },
  name: string
): Promise<CompanyProfile | null> {
  const slug = slugifyCompanyName(name);
  const { data: bySlug } = await db.from('companies').select('*').eq('slug', slug).maybeSingle();
  if (bySlug && !isProfileStale(bySlug)) {
    return companyRowToProfile(bySlug);
  }

  const { data: byName } = await db
    .from('companies')
    .select('*')
    .ilike('name', name.trim())
    .limit(1)
    .maybeSingle();
  if (byName && !isProfileStale(byName)) {
    return companyRowToProfile(byName);
  }

  return null;
}

export async function upsertCompanyProfile(
  db: { from: (table: string) => any },
  profile: CompanyProfile,
  userId?: string
): Promise<CompanyProfile> {
  const row = profileToDbRow(profile, userId);
  const { error } = await db.from('companies').upsert(row, { onConflict: 'id' });
  if (error) throw new Error('Failed to save company profile');
  return profile;
}

export async function resolveOrEnrichCompany(
  db: { from: (table: string) => any },
  input: EnrichCompanyInput,
  userId: string
): Promise<CompanyProfile> {
  const cached = await findCachedCompany(db, input.name);
  if (cached) return cached;

  const payload = await enrichCompanyFromInput(input);
  let profile = enrichedPayloadToProfile(payload);

  const { data: idCollision } = await db.from('companies').select('id').eq('id', profile.id).maybeSingle();
  if (idCollision) {
    profile = { ...profile, id: `${profile.id}-${Date.now().toString(36).slice(-4)}` };
  }

  return upsertCompanyProfile(db, profile, userId);
}
