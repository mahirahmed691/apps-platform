'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAuthErrorMessage, isAlreadyRegistered } from '@yourorg/app-core';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { LinkedInSignInButton } from '@/components/LinkedInSignInButton';
import { AuroraBackground } from '@/components/AuroraBackground';
import { LandingDemo } from '@/components/LandingDemo';
import { LoadingScreen } from '@/components/LoadingScreen';
import { SetupRequired } from '@/components/SetupRequired';
import { RecruiterIntentToggle } from '@/components/RecruiterIntentToggle';
import { useAuth } from '@/hooks/useAuth';
import { resolvePostAuthDestination, setRecruiterIntent, stashAuthNext } from '@/lib/recruiterIntent';
import { getOAuthSiteUrl } from '@/lib/site';

type AccountIntent = 'candidate' | 'recruiter';

type Mode = 'signin' | 'signup' | 'reset';

type IconName = 'mic' | 'profile' | 'preview' | 'export';

function FeatureIcon({ name }: { name: IconName }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  if (name === 'mic') {
    return (
      <svg {...common}>
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </svg>
    );
  }
  if (name === 'profile') {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20a7 7 0 0 1 14 0" />
      </svg>
    );
  }
  if (name === 'preview') {
    return (
      <svg {...common}>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 8h8M8 12h8M8 16h4" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M12 3v11m0 0 4-4m-4 4-4-4" />
      <path d="M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

const FEATURE_DETAILS: Array<{ icon: IconName; label: string; title: string; copy: string }> = [
  {
    icon: 'mic',
    label: 'Voice interview',
    title: 'Guided prompts, not a blank page',
    copy: 'Ceevie asks the right follow-ups and turns spoken answers into CV-ready sections.',
  },
  {
    icon: 'profile',
    label: 'Profile memory',
    title: 'Your basics stay ready',
    copy: 'Save your name, headline, location, LinkedIn URL, and photo once for every future CV.',
  },
  {
    icon: 'preview',
    label: 'Live preview',
    title: 'Watch the document take shape',
    copy: 'Each answer updates the preview, so you can see what is missing before exporting.',
  },
  {
    icon: 'export',
    label: 'Export',
    title: 'Polished PDF when you are done',
    copy: 'Generate a clean, recruiter-friendly CV from the story you just captured.',
  },
];

const WORKFLOW_STEPS = ['Connect', 'Speak', 'Review', 'Export'];

const AUTH_STATS = [
  { value: '6', label: 'guided CV sections' },
  { value: 'Voice', label: 'first interview' },
  { value: 'Live', label: 'preview while you speak' },
  { value: 'PDF', label: 'export when ready' },
];

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
          redirectTo: `${getOAuthSiteUrl()}/login`,
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
    <div className="auth-page auth-page-breakthrough">
      <AuroraBackground />

      <div className="auth-page-content">
      <div className="auth-page-hero">
        <aside className="auth-manifesto" aria-hidden="false">
          <p className="auth-manifesto-kicker">The end of blank pages</p>
          <h2 className="auth-manifesto-title">
            You don&apos;t write CVs.
            <span>You tell your story.</span>
          </h2>
          <ul className="auth-manifesto-points">
            <li>Speak naturally — Ceevie asks the questions out loud</li>
            <li>Watch your CV materialize in real time on the page</li>
            <li>Export a polished PDF in one tap when you&apos;re done</li>
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

      <section className="auth-feature-section" aria-labelledby="auth-feature-title">
        <div className="auth-feature-header">
          <div className="auth-feature-heading">
            <p className="auth-feature-eyebrow">Built for job applications</p>
            <h3 id="auth-feature-title">Everything between your experience and a finished CV.</h3>
          </div>

          <div className="auth-workflow" aria-label="Ceevie workflow">
            {WORKFLOW_STEPS.map((step, index) => (
              <div className="auth-workflow-step" key={step}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{step}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="auth-feature-grid">
          {FEATURE_DETAILS.map((feature) => (
            <article className="auth-feature-card" key={feature.label}>
              <span className="auth-feature-card-icon">
                <FeatureIcon name={feature.icon} />
              </span>
              <p>{feature.label}</p>
              <h4>{feature.title}</h4>
              <span className="auth-feature-card-copy">{feature.copy}</span>
            </article>
          ))}
        </div>

        <dl className="auth-feature-stats">
          {AUTH_STATS.map((stat) => (
            <div className="auth-feature-stat" key={stat.label}>
              <dt>{stat.label}</dt>
              <dd>{stat.value}</dd>
            </div>
          ))}
        </dl>
      </section>
      </div>
    </div>
  );
}
