'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAuthErrorMessage } from '@yourorg/app-core';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { SetupRequired } from '@/components/SetupRequired';
import { useAuth } from '@/hooks/useAuth';
import { getSiteUrl } from '@/lib/site';

type Mode = 'signin' | 'signup';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
          <p>Loading…</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loading, configured, supabase } = useAuth({ redirectIfAuthenticated: '/' });
  const siteUrl = getSiteUrl();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const authError = searchParams.get('error');
    if (authError === 'setup') {
      setError('App setup incomplete. Check your environment variables.');
    } else if (authError === 'auth') {
      setError('Google sign-in did not complete. Please try again.');
    } else if (authError) {
      setError(decodeURIComponent(authError));
    }
  }, [searchParams]);

  if (!configured) return <SetupRequired />;
  if (loading || !supabase) {
    return (
      <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
        <p>Loading…</p>
      </main>
    );
  }

  const authClient = supabase;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);

    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await authClient.auth.signUp({ email, password });
        if (signUpError) {
          const message = getAuthErrorMessage(signUpError);
          if (message.includes('already exists')) {
            setMode('signin');
            setInfo('Account found — sign in with your password below.');
          }
          setError(message);
          return;
        }

        if (data.session) {
          router.replace('/');
          router.refresh();
          return;
        }

        setInfo('Check your email to confirm your account, then sign in.');
        setMode('signin');
        return;
      }

      const { error: signInError } = await authClient.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(getAuthErrorMessage(signInError));
        return;
      }

      router.replace('/');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui', maxWidth: '28rem' }}>
      <h1>__APP_NAME__</h1>
      <p>{mode === 'signin' ? 'Sign in to continue.' : 'Create an account to get started.'}</p>

      <div style={{ marginTop: '1.5rem', display: 'grid', gap: '1rem' }}>
        <GoogleSignInButton supabase={authClient} siteUrl={siteUrl} />

        <div
          aria-hidden="true"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: '#666',
            fontSize: '0.8125rem',
          }}
        >
          <span style={{ flex: 1, height: 1, background: '#e0e0e0' }} />
          <span>or continue with email</span>
          <span style={{ flex: 1, height: 1, background: '#e0e0e0' }} />
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.75rem', marginTop: '1rem' }}>
        <label style={{ display: 'grid', gap: '0.25rem' }}>
          Email
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            style={{ padding: '0.5rem' }}
          />
        </label>

        <label style={{ display: 'grid', gap: '0.25rem' }}>
          Password
          <input
            type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            style={{ padding: '0.5rem' }}
          />
        </label>

        {error && (
          <p role="alert" style={{ color: '#b00020', margin: 0 }}>
            {error}
          </p>
        )}

        {info && (
          <p role="status" style={{ color: '#00695c', margin: 0 }}>
            {info}
          </p>
        )}

        <button type="submit" disabled={submitting} style={{ padding: '0.625rem 1rem' }}>
          {submitting ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
        </button>
      </form>

      <p style={{ marginTop: '1rem' }}>
        {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
        <button
          type="button"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
            setError(null);
            setInfo(null);
          }}
          style={{ background: 'none', border: 'none', padding: 0, color: '#1565c0', cursor: 'pointer', textDecoration: 'underline' }}
        >
          {mode === 'signin' ? 'Sign up' : 'Sign in'}
        </button>
      </p>
    </main>
  );
}
