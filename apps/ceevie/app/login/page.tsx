'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAuthErrorMessage, isAlreadyRegistered } from '@yourorg/app-core';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { LinkedInSignInButton } from '@/components/LinkedInSignInButton';
import { AuroraBackground } from '@/components/AuroraBackground';
import { AuthFeatureShowcase } from '@/components/AuthFeatureShowcase';
import { LandingDemo } from '@/components/LandingDemo';
import { LoadingScreen } from '@/components/LoadingScreen';
import { SetupRequired } from '@/components/SetupRequired';
import { RecruiterIntentToggle } from '@/components/RecruiterIntentToggle';
import { useAuth } from '@/hooks/useAuth';
import { resolvePostAuthDestination, setRecruiterIntent, stashAuthNext } from '@/lib/recruiterIntent';
import { getOAuthSiteUrl } from '@/lib/site';

type AccountIntent = 'candidate' | 'recruiter';

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
  const nextPath = searchParams.get('next');
  const recruiterFromUrl = searchParams.get('recruiter') === '1';
  const redirectTarget = nextPath?.startsWith('/') ? nextPath : '/';
  const { loading, configured, supabase } = useAuth({ redirectIfAuthenticated: redirectTarget });
  const siteUrl = getOAuthSiteUrl();

  const [accountIntent, setAccountIntent] = useState<AccountIntent>(
    recruiterFromUrl ? 'recruiter' : 'candidate'
  );

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
      setError('Sign-in did not complete. Please try again.');
    } else if (authError) {
      setError(decodeURIComponent(authError));
    }

    if (searchParams.get('reset') === 'success') {
      setInfo('Password updated. Sign in with your new password.');
      setMode('signin');
    }
  }, [searchParams]);

  useEffect(() => {
    if (recruiterFromUrl) setAccountIntent('recruiter');
  }, [recruiterFromUrl]);

  useEffect(() => {
    setRecruiterIntent(accountIntent === 'recruiter');
  }, [accountIntent]);

  useEffect(() => {
    stashAuthNext(nextPath);
  }, [nextPath]);

  function persistAuthIntent() {
    setRecruiterIntent(accountIntent === 'recruiter');
    stashAuthNext(nextPath);
  }

  if (!configured) return <SetupRequired />;
  if (loading || !supabase) {
    return <LoadingScreen message="Loading…" />;
  }

  const authClient = supabase;

  async function completeSignIn() {
    const {
      data: { session },
    } = await authClient.auth.getSession();
    const destination = await resolvePostAuthDestination(session?.access_token);
    router.replace(destination);
    router.refresh();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    persistAuthIntent();
    setSubmitting(true);

    try {
      if (mode === 'reset') {
        const { error: resetError } = await authClient.auth.resetPasswordForEmail(email, {
          redirectTo: `${getOAuthSiteUrl()}/auth/update-password`,
        });
        if (resetError) {
          setError(getAuthErrorMessage(resetError));
          return;
        }
        setInfo('Password reset email sent — open the link in your inbox to choose a new password.');
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
    <div className="auth-page auth-page-breakthrough">
      <AuroraBackground />

      <div className="auth-page-content">
      <div className="auth-page-hero">
        <aside className="auth-manifesto" aria-hidden="false">
          <p className="auth-manifesto-kicker">
            {accountIntent === 'recruiter' ? 'For hiring teams' : 'The end of blank pages'}
          </p>
          <h2 className="auth-manifesto-title">
            {accountIntent === 'recruiter' ? (
              <>
                Brief once.
                <span>Review polished CVs faster.</span>
              </>
            ) : (
              <>
                You don&apos;t write CVs.
                <span>You tell your story.</span>
              </>
            )}
          </h2>
          <ul className="auth-manifesto-points">
            {accountIntent === 'recruiter' ? (
              <>
                <li>Create role briefs with requirements and culture notes</li>
                <li>Invite candidates into tailored voice interviews</li>
                <li>Review generated CVs in your recruiter dashboard</li>
              </>
            ) : (
              <>
                <li>Start fresh, continue a draft, or upload an existing CV</li>
                <li>Speak naturally — guided questions build each section on the page</li>
                <li>Edit inline, tailor to jobs, and export a matching PDF</li>
              </>
            )}
          </ul>

          <LandingDemo />
        </aside>

        <div className="auth-form-stage">
          <main className="auth-card auth-card-focus">
        <p className="auth-kicker">Voice-first CV builder</p>
        <h1>Ceevie</h1>
        <p className="auth-card-lead">
          {mode === 'signin' &&
            (accountIntent === 'recruiter'
              ? 'Sign in to create role briefs and invite candidates.'
              : 'Sign in and talk your way to a professional CV.')}
          {mode === 'signup' &&
            (accountIntent === 'recruiter'
              ? 'Create a recruiter account and send your first invite link.'
              : 'Create an account. Your next CV starts with your voice.')}
          {mode === 'reset' && 'Enter your email for a password reset link.'}
        </p>

        {mode !== 'reset' && (
          <RecruiterIntentToggle
            value={accountIntent}
            onChange={setAccountIntent}
            disabled={submitting}
          />
        )}

        {mode !== 'reset' && (
          <>
            <GoogleSignInButton
              supabase={authClient}
              siteUrl={siteUrl}
              onBeforeSignIn={persistAuthIntent}
            />
            <LinkedInSignInButton
              supabase={authClient}
              siteUrl={siteUrl}
              onBeforeSignIn={persistAuthIntent}
            />
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
      </main>
        </div>
      </div>

      <AuthFeatureShowcase accountIntent={accountIntent} />
      </div>
    </div>
  );
}
