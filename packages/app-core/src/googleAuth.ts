import type { AuthError, SupabaseClient } from '@supabase/supabase-js';

export function buildAuthCallbackUrl(siteUrl: string): string {
  return `${siteUrl.replace(/\/$/, '')}/auth/callback`;
}

export async function signInWithGoogle(
  supabase: SupabaseClient,
  siteUrl: string
): Promise<{ error: AuthError | null }> {
  const redirectTo = buildAuthCallbackUrl(siteUrl);
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });
  return { error };
}
