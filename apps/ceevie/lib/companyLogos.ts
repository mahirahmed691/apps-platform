import type { CompanyProfile } from '@/lib/companies';

/** Known logo domains for curated employers (Clearbit Logo API). */
const COMPANY_LOGO_DOMAINS: Record<string, string> = {
  monzo: 'monzo.com',
  revolut: 'revolut.com',
  starling: 'starlingbank.com',
  wise: 'wise.com',
  spotify: 'spotify.com',
  bbc: 'bbc.co.uk',
  deliveroo: 'deliveroo.co.uk',
  'just-eat': 'justeattakeaway.com',
  govuk: 'gov.uk',
  'nhs-digital': 'nhs.uk',
  amazon: 'amazon.com',
  tesco: 'tesco.com',
  accenture: 'accenture.com',
  deloitte: 'deloitte.com',
  bp: 'bp.com',
  'octopus-energy': 'octopus.energy',
  bt: 'bt.com',
  'rolls-royce': 'rolls-royce.com',
  pearson: 'pearson.com',
  asos: 'asos.com',
};

const ALLOWED_LOGO_HOSTS = new Set(['logo.clearbit.com', 'www.google.com']);

export function getCompanyLogoDomain(company: Pick<CompanyProfile, 'id' | 'slug' | 'name'>): string | null {
  return (
    COMPANY_LOGO_DOMAINS[company.id] ??
    COMPANY_LOGO_DOMAINS[company.slug] ??
    guessLogoDomain(company.name)
  );
}

function guessLogoDomain(name: string): string | null {
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();
  if (!normalized) return null;

  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;

  if (tokens.length === 1) return `${tokens[0]}.com`;

  const joined = tokens.join('');
  return `${joined}.com`;
}

export function buildClearbitLogoUrl(domain: string): string {
  return `https://logo.clearbit.com/${domain}`;
}

export function buildGoogleFaviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
}

export function resolveCompanyLogoUrl(company: Pick<CompanyProfile, 'id' | 'slug' | 'name' | 'logoUrl'>): string | null {
  const explicit = company.logoUrl?.trim();
  if (explicit && isAllowedLogoUrl(explicit)) return explicit;

  const domain = getCompanyLogoDomain(company);
  if (!domain) return null;

  return buildClearbitLogoUrl(domain);
}

export function resolveCompanyLogoFallbackUrl(company: Pick<CompanyProfile, 'id' | 'slug' | 'name' | 'logoUrl'>): string | null {
  const domain = getCompanyLogoDomain(company);
  if (!domain) return null;
  return buildGoogleFaviconUrl(domain);
}

function isAllowedLogoUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && ALLOWED_LOGO_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

export function withResolvedLogoUrl<T extends Pick<CompanyProfile, 'id' | 'slug' | 'name' | 'logoUrl'>>(company: T): T {
  const logoUrl = resolveCompanyLogoUrl(company);
  return logoUrl ? { ...company, logoUrl } : company;
}
