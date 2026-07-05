'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAuthErrorMessage, isAlreadyRegistered } from '@yourorg/app-core';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { LoadingScreen } from '@/components/LoadingScreen';
import { SetupRequired } from '@/components/SetupRequired';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseProjectRef } from '@/lib/supabase';
import { getSiteUrl } from '@/lib/site';

type Mode = 'signin' | 'signup' | 'reset';

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Loading…" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loading, configured, supabase } = useAuth({ redirectIfAuthenticated: '/' });
  const projectRef = getSupabaseProjectRef();
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
    return <LoadingScreen message="Loading…" />;
  }

  const authClient = supabase;

  async function completeSignIn() {
    router.replace('/');
    router.refresh();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);

    try {
      if (mode === 'reset') {
        const { error: resetError } = await authClient.auth.resetPasswordForEmail(email, {
          redirectTo: `${getSiteUrl()}/login`,
        });
        if (resetError) {
          setError(getAuthErrorMessage(resetError));
          return;
        }
        setInfo('Password reset email sent — check your inbox, then sign in with your new password.');
        setMode('signin');
        return;
      }

      if (mode === 'signup') {
        const { data, error: signUpError } = await authClient.auth.signUp({ email, password });
        if (signUpError) {
          if (isAlreadyRegistered(signUpError)) {
            const { error: signInError } = await authClient.auth.signInWithPassword({ email, password });
            if (!signInError) {
              await completeSignIn();
              return;
            }
            setMode('signin');
            setError('Account exists but that password did not work. Use Forgot password? to set one.');
            return;
          }
          setError(getAuthErrorMessage(signUpError));
          return;
        }

        if (data.session) {
          await completeSignIn();
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

      await completeSignIn();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <main className="auth-card">
        <p className="auth-kicker">Voice-first CV builder</p>
        <h1>Ceevie</h1>
        <p>
          {mode === 'signin' && 'Sign in and talk through your experience — we write the CV.'}
          {mode === 'signup' && 'Create an account and build your CV by voice.'}
          {mode === 'reset' && 'Enter your email for a password reset link.'}
        </p>

        {mode !== 'reset' && (
          <>
            <GoogleSignInButton supabase={authClient} siteUrl={siteUrl} />
            <div className="auth-divider" aria-hidden="true">
              <span>or continue with email</span>
            </div>
          </>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-label">
            Email
            <input
              className="auth-input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          {mode !== 'reset' && (
            <label className="auth-label">
              Password
              <input
                className="auth-input"
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
          )}

          {error && (
            <p className="alert alert-error" role="alert">
              {error}
            </p>
          )}

          {info && (
            <p className="alert alert-info" role="status">
              {info}
            </p>
          )}

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Please wait…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Sign up' : 'Send reset link'}
          </button>
        </form>

        {mode === 'signin' && (
          <p className="auth-footer">
            <button
              type="button"
              className="auth-link"
              onClick={() => {
                setMode('reset');
                setError(null);
                setInfo(null);
              }}
            >
              Forgot password?
            </button>
          </p>
        )}

        <p className="auth-footer">
          {mode === 'reset' ? (
            <>
              Remember your password?{' '}
              <button
                type="button"
                className="auth-link"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                  setInfo(null);
                }}
              >
                Sign in
              </button>
            </>
          ) : (
            <>
              {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button
                type="button"
                className="auth-link"
                onClick={() => {
                  setMode(mode === 'signin' ? 'signup' : 'signin');
                  setError(null);
                  setInfo(null);
                }}
              >
                {mode === 'signin' ? 'Sign up' : 'Sign in'}
              </button>
            </>
          )}
        </p>

        {process.env.NODE_ENV === 'development' && projectRef && (
          <p className="auth-dev">
            Supabase project: <code>{projectRef}</code>
          </p>
        )}
      </main>
    </div>
  );
}
