const PRODUCTION_SITE_URL = 'https://www.ceevie.co.uk';

/** Public site origin for redirects and metadata. Never trust client input here. */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  if (fromEnv) return fromEnv;

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return PRODUCTION_SITE_URL;
}

/** OAuth redirect origin — must match the tab where sign-in started (PKCE verifier lives in localStorage). */
export function getOAuthSiteUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return getSiteUrl();
}

export function getSiteDomain(): string {
  return new URL(getSiteUrl()).host;
}
