const PRODUCTION_SITE_URL = 'https://ceevie.co.uk';

/** Public site origin for redirects and metadata. Never trust client input here. */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  if (fromEnv) return fromEnv;

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return PRODUCTION_SITE_URL;
}

export function getSiteDomain(): string {
  return new URL(getSiteUrl()).host;
}
