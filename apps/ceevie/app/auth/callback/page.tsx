'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { syncLinkedInProfileFromClient } from '@/lib/linkedinSyncClient';
import { resolvePostAuthDestination } from '@/lib/recruiterIntent';

function parseHashTokens(): { access_token: string; refresh_token: string } | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return null;

  const params = new URLSearchParams(hash);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token || !refresh_token) return null;

  return { access_token, refresh_token };
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState('Signing you in…');

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      router.replace('/login?error=setup');
      return;
    }

    async function establishSession(): Promise<{ ok: true } | { ok: false; error: string }> {
      if (!supabase) return { ok: false, error: 'setup' };

      const params = new URLSearchParams(window.location.search);
      const errorDescription = params.get('error_description');

      if (errorDescription) {
        return { ok: false, error: errorDescription };
      }

      // Supabase auto-exchanges ?code= during client initialization — wait before manual exchange.
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) return { ok: true };

        if (attempt < 2) {
          await new Promise((resolve) => window.setTimeout(resolve, 150 * (attempt + 1)));
        }
      }

      const code = params.get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) return { ok: false, error: error.message };
        return { ok: true };
      }

      const hashTokens = parseHashTokens();
      if (hashTokens) {
        const { error } = await supabase.auth.setSession(hashTokens);
        if (error) return { ok: false, error: error.message };
        return { ok: true };
      }

      return { ok: false, error: 'auth' };
    }

    async function completeAuth() {
      if (!supabase) return;

      const linkedInImport = new URLSearchParams(window.location.search).get('linkedin') === 'import';
      const sessionResult = await establishSession();

      if (!sessionResult.ok) {
        if (sessionResult.error === 'setup') {
          router.replace('/login?error=setup');
          return;
        }
        if (sessionResult.error === 'auth') {
          router.replace('/login?error=auth');
          return;
        }
        router.replace(`/login?error=${encodeURIComponent(sessionResult.error)}`);
        return;
      }

      const recoveryType = new URLSearchParams(window.location.search).get('type');
      if (recoveryType === 'recovery') {
        router.replace('/auth/update-password');
        router.refresh();
        return;
      }

      if (linkedInImport) {
        setMessage('Importing your LinkedIn details…');
        await new Promise((resolve) => window.setTimeout(resolve, 800));

        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (token) {
          const synced = await syncLinkedInProfileFromClient(supabase, token, { retries: 4 });
          router.replace(synced.ok ? '/?linkedin=synced' : '/?linkedin=sync-failed');
          router.refresh();
          return;
        }
      }

      setMessage('Success — redirecting…');
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const destination = await resolvePostAuthDestination(session?.access_token);
      router.replace(destination);
      router.refresh();
    }

    completeAuth();
  }, [router]);

  return (
    <div className="loading-screen">
      <p>{message}</p>
    </div>
  );
}
