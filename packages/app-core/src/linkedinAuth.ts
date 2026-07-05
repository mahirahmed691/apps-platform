import type { AuthError, SupabaseClient } from '@supabase/supabase-js';
import { buildAuthCallbackUrl } from './googleAuth';

export const LINKEDIN_OAUTH_PROVIDER = 'linkedin_oidc' as const;

/** Scopes for CV import via Verified on LinkedIn + OIDC sign-in. */
export const LINKEDIN_IMPORT_SCOPES =
  'openid profile email r_profile_basicinfo r_verify';

export function buildLinkedInImportCallbackUrl(siteUrl: string): string {
  const base = buildAuthCallbackUrl(siteUrl);
  return `${base}?linkedin=import`;
}

export async function signInWithLinkedIn(
  supabase: SupabaseClient,
  siteUrl: string
): Promise<{ error: AuthError | null }> {
  const redirectTo = buildLinkedInImportCallbackUrl(siteUrl);
  const { error } = await supabase.auth.signInWithOAuth({
    provider: LINKEDIN_OAUTH_PROVIDER,
    options: {
      redirectTo,
      scopes: LINKEDIN_IMPORT_SCOPES,
    },
  });
  return { error };
}

/** Link LinkedIn to the current account, then import profile on callback. */
export async function connectLinkedIn(
  supabase: SupabaseClient,
  siteUrl: string
): Promise<{ error: AuthError | null }> {
  const redirectTo = buildLinkedInImportCallbackUrl(siteUrl);
  const { error } = await supabase.auth.linkIdentity({
    provider: LINKEDIN_OAUTH_PROVIDER,
    options: {
      redirectTo,
      scopes: LINKEDIN_IMPORT_SCOPES,
    },
  });
  return { error };
}

const LINKEDIN_PROVIDERS = new Set([LINKEDIN_OAUTH_PROVIDER, 'linkedin']);

export function userHasLinkedInIdentity(user: {
  identities?: { provider: string }[] | null;
  app_metadata?: { provider?: string; providers?: string[] } | null;
}): boolean {
  if (user.app_metadata?.provider && LINKEDIN_PROVIDERS.has(user.app_metadata.provider)) {
    return true;
  }

  const providers = user.app_metadata?.providers;
  if (Array.isArray(providers)) {
    if (providers.some((provider) => typeof provider === 'string' && LINKEDIN_PROVIDERS.has(provider))) {
      return true;
    }
  }

  return Boolean(user.identities?.some((identity) => LINKEDIN_PROVIDERS.has(identity.provider)));
}
