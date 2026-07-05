import type { SupabaseClient } from '@supabase/supabase-js';

export type LinkedInSyncResult = {
  ok: boolean;
  profile?: unknown;
  message?: string;
  importedSummary?: string;
  error?: string;
};

export async function syncLinkedInProfileFromClient(
  supabase: SupabaseClient,
  accessToken: string,
  options?: { retries?: number }
): Promise<LinkedInSyncResult> {
  const retries = Math.max(1, options?.retries ?? 1);

  await supabase.auth.refreshSession().catch(() => undefined);
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token ?? accessToken;
  const providerToken = sessionData.session?.provider_token ?? null;

  for (let attempt = 0; attempt < retries; attempt += 1) {
    if (attempt > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, 500 * attempt));
    }

    const response = await fetch('/api/linkedin/sync', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ providerToken }),
    });
    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      return {
        ok: true,
        profile: data.profile,
        message: typeof data.message === 'string' ? data.message : undefined,
        importedSummary: typeof data.importedSummary === 'string' ? data.importedSummary : undefined,
      };
    }

    if (attempt === retries - 1) {
      return {
        ok: false,
        error: typeof data.error === 'string' ? data.error : 'LinkedIn import failed.',
      };
    }
  }

  return { ok: false, error: 'LinkedIn import failed.' };
}
