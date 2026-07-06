'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthErrorMessage } from '@yourorg/app-core';
import { AuroraBackground } from '@/components/AuroraBackground';
import { LoadingScreen } from '@/components/LoadingScreen';
import { SetupRequired } from '@/components/SetupRequired';
import { getSupabaseClient } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/env';
import type { SupabaseClient } from '@supabase/supabase-js';

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

function UpdatePasswordForm() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!configured) return;

    const client = getSupabaseClient();
    if (!client) return;

    const db: SupabaseClient = client;

    async function establishRecoverySession(): Promise<{ ok: true } | { ok: false; message?: string }> {
      const params = new URLSearchParams(window.location.search);
      const errorDescription = params.get('error_description');
      if (errorDescription) {
        return { ok: false, message: decodeURIComponent(errorDescription) };
      }

      for (let attempt = 0; attempt < 4; attempt += 1) {
        const {
          data: { session },
        } = await db.auth.getSession();
        if (session) return { ok: true };

        if (attempt < 3) {
          await new Promise((resolve) => window.setTimeout(resolve, 150 * (attempt + 1)));
        }
      }

      const code = params.get('code');
      if (code) {
        const { error: exchangeError } = await db.auth.exchangeCodeForSession(code);
        if (!exchangeError) return { ok: true };
        return { ok: false, message: getAuthErrorMessage(exchangeError) };
      }

      const hashTokens = parseHashTokens();
      if (hashTokens) {
        const { error: sessionError } = await db.auth.setSession(hashTokens);
        if (!sessionError) return { ok: true };
        return { ok: false, message: getAuthErrorMessage(sessionError) };
      }

      return { ok: false };
    }

    void establishRecoverySession().then((result) => {
      if (result.ok) {
        setReady(true);
        return;
      }
      if (result.message) {
        setError(result.message);
        return;
      }
      router.replace(
        `/login?error=${encodeURIComponent('This reset link is invalid or has expired. Request a new one from Forgot password.')}`
      );
    });
  }, [configured, router]);

  if (!configured) return <SetupRequired />;
  if (!ready) {
    return <LoadingScreen message="Verifying reset link…" />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError('App setup incomplete. Check your environment variables.');
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(getAuthErrorMessage(updateError));
        return;
      }

      await supabase.auth.signOut();
      router.replace('/login?reset=success');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page auth-page-breakthrough">
      <AuroraBackground />
      <div className="auth-page-content">
        <div className="auth-form-stage">
          <main className="auth-card auth-card-focus">
            <p className="auth-kicker">Account security</p>
            <h1>Set a new password</h1>
            <p className="auth-card-lead">Choose a new password for your Ceevie account.</p>

            <form className="auth-form" onSubmit={handleSubmit}>
              <label className="auth-label">
                New password
                <input
                  className="auth-input"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>

              <label className="auth-label">
                Confirm password
                <input
                  className="auth-input"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </label>

              {error && (
                <p className="alert alert-error" role="alert">
                  {error}
                </p>
              )}

              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Saving…' : 'Update password'}
              </button>
            </form>

            <p className="auth-footer">
              <a className="auth-link" href="/login">
                Back to sign in
              </a>
            </p>
          </main>
        </div>
      </div>
    </div>
  );
}

export default function UpdatePasswordPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Loading…" />}>
      <UpdatePasswordForm />
    </Suspense>
  );
}
