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

    client.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (options.redirectIfAuthenticated && currentSession) {
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
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (options.requireAuth && !nextSession) {
        router.replace('/login');
        return;
      }

      if (options.redirectIfAuthenticated && nextSession) {
        router.replace(options.redirectIfAuthenticated);
        return;
      }

      setSession(nextSession);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [configured, options.requireAuth, options.redirectIfAuthenticated, router]);

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.replace('/login');
  }

  return { session, loading, configured, supabase, signOut };
}
