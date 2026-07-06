'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseConfigured } from '@/lib/env';
import { getSupabaseClient } from '@/lib/supabase';

type UseAuthOptions = {
  requireAuth?: boolean;
  redirectIfAuthenticated?: string;
};

const PASSWORD_RECOVERY_PATH = '/auth/update-password';

function isPasswordRecoveryRoute(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.pathname === PASSWORD_RECOVERY_PATH;
}

function shouldRedirectAuthenticatedSession(event: string | undefined): boolean {
  if (isPasswordRecoveryRoute()) return false;
  return event !== 'PASSWORD_RECOVERY';
}

async function resolveValidSession(client: SupabaseClient): Promise<Session | null> {
  const { data: userData, error: userError } = await client.auth.getUser();
  if (!userError && userData.user) {
    const { data: sessionData } = await client.auth.getSession();
    return sessionData.session;
  }

  const { data: refreshData, error: refreshError } = await client.auth.refreshSession();
  if (!refreshError && refreshData.session) {
    return refreshData.session;
  }

  await client.auth.signOut();
  return null;
}

export function useAuth(options: UseAuthOptions = {}) {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(configured);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      setLoading(false);
      return;
    }

    setSupabase(client);

    let cancelled = false;
    let initialValidationDone = false;

    void resolveValidSession(client).then((currentSession) => {
      if (cancelled) return;
      initialValidationDone = true;

      if (options.redirectIfAuthenticated && currentSession && shouldRedirectAuthenticatedSession(undefined)) {
        router.replace(options.redirectIfAuthenticated);
        return;
      }

      if (options.requireAuth && !currentSession) {
        router.replace('/login');
        return;
      }

      setSession(currentSession);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, nextSession) => {
      if (!initialValidationDone && event === 'INITIAL_SESSION') return;

      if (event === 'PASSWORD_RECOVERY' && nextSession && !isPasswordRecoveryRoute()) {
        router.replace(PASSWORD_RECOVERY_PATH);
        setSession(nextSession);
        setLoading(false);
        return;
      }

      if (options.requireAuth && !nextSession) {
        router.replace('/login');
        return;
      }

      if (options.redirectIfAuthenticated && nextSession && shouldRedirectAuthenticatedSession(event)) {
        router.replace(options.redirectIfAuthenticated);
        return;
      }

      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [configured, options.requireAuth, options.redirectIfAuthenticated, router]);

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.replace('/login');
  }

  return { session, loading, configured, supabase, signOut };
}
