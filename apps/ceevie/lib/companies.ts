import type { CvAnswers, CompanyTailorContext } from '@/lib/cvBuilder';
import { curatedCatalogAsProfiles } from '@/lib/companyCatalog';
import { getIndustryTemplate, type IndustryTemplate } from '@/lib/industryTemplates';

export type CompanyDataSource = 'curated' | 'template' | 'enriched';

export type CompanyProfile = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string;
  accentColor: string;
  industryId: string;
  dataSource: CompanyDataSource;
  region: string;
  isFeatured: boolean;
  summary: string;
  tooling: string[];
  domains: string[];
  methodologies: string[];
  rolePatterns: string[];
  hiringSignals: string;
};

export type AlignmentDimension = 'tooling' | 'domains' | 'methodologies';

export type CompanyAlignment = {
  companyId: string;
  score: number;
  summary: string;
  matched: {
    tooling: string[];
    domains: string[];
    methodologies: string[];
  };
  gaps: {
    tooling: string[];
    domains: string[];
    methodologies: string[];
  };
  focusPrompts: string[];
};

export type CompanySearchOptions = {
  query?: string;
  industryId?: string;
  featuredOnly?: boolean;
  limit?: number;
};

export const COMPANY_CATALOG: CompanyProfile[] = curatedCatalogAsProfiles();

export function slugifyCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

export function mergeUniqueTerms(...lists: (string[] | undefined)[]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const list of lists) {
    if (!list) continue;
    for (const item of list) {
      const value = item.trim();
      if (!value || seen.has(value.toLowerCase())) continue;
      seen.add(value.toLowerCase());
      merged.push(value);
    }
  }
  return merged;
}

/** Merge sparse enriched profiles with their industry template defaults. */
export function resolveCompanyProfile(company: CompanyProfile, template?: IndustryTemplate): CompanyProfile {
  if (company.dataSource === 'curated' || !template) return company;

  return {
    ...company,
    accentColor: company.accentColor || template.accentColor,
    summary: company.summary || template.summary,
    tooling: mergeUniqueTerms(company.tooling, template.tooling),
    domains: mergeUniqueTerms(company.domains, template.domains),
    methodologies: mergeUniqueTerms(company.methodologies, template.methodologies),
    rolePatterns: mergeUniqueTerms(company.rolePatterns, template.rolePatterns),
    hiringSignals: company.hiringSignals || template.hiringSignals,
  };
}

export function resolveCompanyList(companies: CompanyProfile[]): CompanyProfile[] {
  return companies.map((company) => resolveCompanyProfile(company, getIndustryTemplate(company.industryId)));
}

export function getCompanyById(id: string, companies: CompanyProfile[] = COMPANY_CATALOG): CompanyProfile | undefined {
  return companies.find((company) => company.id === id);
}

export function searchCompanies(companies: CompanyProfile[], options: CompanySearchOptions = {}): CompanyProfile[] {
  const query = options.query?.trim().toLowerCase() ?? '';
  const industryId = options.industryId?.trim() ?? '';
  const limit = options.limit ?? 60;

  let results = resolveCompanyList(companies);

  if (industryId) {
    results = results.filter((company) => company.industryId === industryId);
  }
  if (options.featuredOnly) {
    results = results.filter((company) => company.isFeatured);
  }
  if (query) {
    results = results.filter((company) => {
      const haystack = [
        company.name,
        company.summary,
        company.industryId,
        ...company.domains,
        ...company.tooling,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }

  return results
    .sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      return a.name.localeCompare(b.name);
    })
    .slice(0, limit);
}

export function buildCompanyJobDescription(company: CompanyProfile): string {
  return [
    `Target employer: ${company.name}`,
    company.summary,
    '',
    'Typical tooling:',
    company.tooling.join(', '),
    '',
    'Domains:',
    company.domains.join(', '),
    '',
    'Ways of working:',
    company.methodologies.join(', '),
    '',
    'Hiring signals:',
    company.hiringSignals,
  ].join('\n');
}

export function buildMultiCompanyJobDescription(companies: CompanyProfile[]): string {
  if (companies.length === 0) return '';
  if (companies.length === 1) return buildCompanyJobDescription(companies[0]);

  return [
    `Target employers: ${companies.map((c) => c.name).join(', ')}`,
    '',
    'Shared tailoring goal: position the candidate strongly across these companies and role families.',
    '',
    ...companies.flatMap((company) => [`--- ${company.name} ---`, buildCompanyJobDescription(company), '']),
  ].join('\n');
}

export function mergeCompanyProfilesById(...lists: CompanyProfile[][]): CompanyProfile[] {
  const map = new Map<string, CompanyProfile>();
  for (const list of lists) {
    for (const company of list) {
      if (!map.has(company.id)) map.set(company.id, company);
    }
  }
  return Array.from(map.values());
}

export function buildWorkedAtTailorBlock(companies: CompanyProfile[]): string {
  if (companies.length === 0) return '';
  const resolved = resolveCompanyList(companies);
  return [
    '--- Employers the candidate has worked at (emphasise authentic overlap — do not invent tenure) ---',
    ...resolved.map((company) =>
      [
        `Company: ${company.name}`,
        `Evidence to surface: projects, tooling, and outcomes tied to ${company.name}.`,
        `Stack used there: ${company.tooling.slice(0, 10).join(', ')}`,
        `Domains: ${company.domains.join(', ')}`,
        `Ways of working: ${company.methodologies.join(', ')}`,
      ].join('\n')
    ),
  ].join('\n\n');
}

export function buildTailoringJobDescription(
  selected: CompanyProfile[],
  workedAt: CompanyProfile[] = []
): string {
  const merged = mergeCompanyProfilesById(workedAt, selected);
  const blocks = [
    workedAt.length ? buildWorkedAtTailorBlock(workedAt) : '',
    merged.length ? buildMultiCompanyJobDescription(merged) : '',
  ].filter(Boolean);
  return blocks.join('\n\n');
}

export function getIndustryLabel(
  industryId: string,
  industries: Array<{ id: string; name: string }> = []
): string {
  return industries.find((item) => item.id === industryId)?.name ?? industryId.replace(/-/g, ' ');
}

export function buildCompanyTailorBlock(companies: CompanyProfile[]): string {
  if (companies.length === 0) return '';
  const resolved = resolveCompanyList(companies);
  return [
    '--- Followed target companies (tailor CV and interview notes to these employers) ---',
    ...resolved.map((company) =>
      [
        `Company: ${company.name}`,
        `Priority tooling: ${company.tooling.slice(0, 8).join(', ')}`,
        `Priority domains: ${company.domains.join(', ')}`,
        `Ways of working: ${company.methodologies.join(', ')}`,
        `Hiring signals: ${company.hiringSignals}`,
      ].join('\n')
    ),
    'Surface evidence that matches these stacks and domains. Do not invent employers or tools the candidate has not implied.',
  ].join('\n\n');
}

function collectAnswerText(answers: CvAnswers): string {
  return [
    answers.targetRole,
    answers.recentRole,
    answers.achievements,
    answers.experience,
    answers.skills,
    answers.education,
    answers.extras,
  ]
    .join(' ')
    .toLowerCase();
}

function matchTerms(corpus: string, terms: string[]): { matched: string[]; gaps: string[] } {
  const matched: string[] = [];
  const gaps: string[] = [];

  for (const term of terms) {
    if (corpus.includes(term.toLowerCase())) matched.push(term);
    else gaps.push(term);
  }

  return { matched, gaps };
}

export function scoreCompanyAlignment(company: CompanyProfile, answers: CvAnswers): CompanyAlignment {
  const resolved = resolveCompanyProfile(company, getIndustryTemplate(company.industryId));
  const corpus = collectAnswerText(answers);
  const tooling = matchTerms(corpus, resolved.tooling);
  const domains = matchTerms(corpus, resolved.domains);
  const methodologies = matchTerms(corpus, resolved.methodologies);

  const toolingScore = resolved.tooling.length ? tooling.matched.length / resolved.tooling.length : 0;
  const domainScore = resolved.domains.length ? domains.matched.length / resolved.domains.length : 0;
  const methodologyScore = resolved.methodologies.length
    ? methodologies.matched.length / resolved.methodologies.length
    : 0;
  const score = Math.round((toolingScore * 0.5 + domainScore * 0.3 + methodologyScore * 0.2) * 100);

  const focusPrompts: string[] = [];
  if (tooling.gaps.length > 0) {
    focusPrompts.push(`Which projects used ${tooling.gaps.slice(0, 3).join(', ')}?`);
  }
  if (domains.gaps.length > 0) {
    focusPrompts.push(`Have you worked in ${domains.gaps.slice(0, 2).join(' or ')} environments?`);
  }
  if (methodologies.gaps.length > 0) {
    focusPrompts.push(`How have you applied ${methodologies.gaps.slice(0, 2).join(' or ')} in delivery?`);
  }

  const summary =
    score >= 70
      ? `Strong overlap with ${resolved.name} — especially ${tooling.matched.slice(0, 3).join(', ') || 'your current stack'}.`
      : score >= 40
        ? `Partial fit for ${resolved.name}. Strengthen ${tooling.gaps.slice(0, 2).join(' and ') || 'tooling evidence'}.`
        : `Early fit for ${resolved.name}. Add examples with ${resolved.tooling.slice(0, 3).join(', ')}.`;

  return {
    companyId: company.id,
    score,
    summary,
    matched: {
      tooling: tooling.matched,
      domains: domains.matched,
      methodologies: methodologies.matched,
    },
    gaps: {
      tooling: tooling.gaps,
      domains: domains.gaps,
      methodologies: methodologies.gaps,
    },
    focusPrompts,
  };
}

export function scoreCompaniesForAnswers(
  answers: CvAnswers,
  companyIds: string[] | undefined,
  catalog: CompanyProfile[] = COMPANY_CATALOG
): CompanyAlignment[] {
  const companies = companyIds?.length
    ? companyIds.map((id) => getCompanyById(id, catalog)).filter(Boolean)
    : catalog;

  return (companies as CompanyProfile[])
    .map((company) => scoreCompanyAlignment(company, answers))
    .sort((a, b) => b.score - a.score);
}

export function toTailorContext(company: CompanyProfile): CompanyTailorContext {
  const resolved = resolveCompanyProfile(company, getIndustryTemplate(company.industryId));
  return {
    name: resolved.name,
    tooling: resolved.tooling,
    domains: resolved.domains,
    methodologies: resolved.methodologies,
    hiringSignals: resolved.hiringSignals,
  };
}

export async function loadFollowedCompanyContexts(
  db: { from: (table: string) => any },
  userId: string
): Promise<CompanyTailorContext[]> {
  const { data: followRows } = await db.from('company_follows').select('company_id').eq('user_id', userId);
  if (!followRows?.length) return [];

  const companies = await loadCompaniesFromDb(db);
  const followed: CompanyProfile[] = [];

  for (const row of followRows as { company_id: string }[]) {
    const company = companies.find((item) => item.id === row.company_id);
    if (company) followed.push(company);
  }

  return followed.map((company) => toTailorContext(company));
}

export async function loadCompaniesFromDb(db: { from: (table: string) => any }): Promise<CompanyProfile[]> {
  const { data, error } = await db.from('companies').select('*').order('name');
  if (error || !data?.length) return COMPANY_CATALOG;
  return data.map((row: Record<string, unknown>) => companyRowToProfile(row));
}

export function companyRowToProfile(row: Record<string, unknown>): CompanyProfile {
  const dataSource = row.data_source;
  return {
    id: String(row.id),
    name: typeof row.name === 'string' ? row.name : '',
    slug: typeof row.slug === 'string' ? row.slug : String(row.id),
    logoUrl: typeof row.logo_url === 'string' ? row.logo_url : '',
    accentColor: typeof row.accent_color === 'string' ? row.accent_color : '#ffffff',
    industryId: typeof row.industry_id === 'string' ? row.industry_id : 'consulting',
    dataSource:
      dataSource === 'curated' || dataSource === 'template' || dataSource === 'enriched' ? dataSource : 'curated',
    region: typeof row.region === 'string' ? row.region : 'uk',
    isFeatured: row.is_featured === true,
    summary: typeof row.summary === 'string' ? row.summary : '',
    tooling: Array.isArray(row.tooling) ? row.tooling.filter((item): item is string => typeof item === 'string') : [],
    domains: Array.isArray(row.domains) ? row.domains.filter((item): item is string => typeof item === 'string') : [],
    methodologies: Array.isArray(row.methodologies)
      ? row.methodologies.filter((item): item is string => typeof item === 'string')
      : [],
    rolePatterns: Array.isArray(row.role_patterns)
      ? row.role_patterns.filter((item): item is string => typeof item === 'string')
      : [],
    hiringSignals: typeof row.hiring_signals === 'string' ? row.hiring_signals : '',
  };
}
