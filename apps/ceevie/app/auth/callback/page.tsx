'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState('Signing you in…');

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      router.replace('/login?error=setup');
      return;
    }

    async function completeAuth() {
      if (!supabase) return;

      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const errorDescription = params.get('error_description');

      if (errorDescription) {
        router.replace(`/login?error=${encodeURIComponent(errorDescription)}`);
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          router.replace(`/login?error=${encodeURIComponent(error.message)}`);
          return;
        }
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.replace('/login?error=auth');
          return;
        }
      }

      setMessage('Success — redirecting…');
      router.replace('/');
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
