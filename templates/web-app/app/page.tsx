'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseApiError } from '@yourorg/app-core';
import { AppOnboardingGate } from '@/components/AppOnboardingGate';
import { SetupRequired } from '@/components/SetupRequired';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { onboardingComplete, normalizeUserProfile } from '@/lib/userProfile';

export default function Home() {
  const router = useRouter();
  const { session, loading, configured, supabase, signOut } = useAuth({ requireAuth: true });
  const accessToken = session?.access_token;

  const { profile, loaded: profileLoaded, loadError: profileLoadError, saveStatus, saveProfile, completeStudioSetup } =
    useUserProfile(accessToken);

  const [forceOnboarding, setForceOnboarding] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !profileLoaded) return;
    if (new URLSearchParams(window.location.search).get('onboarding') !== 'welcome') return;

    const url = new URL(window.location.href);
    url.searchParams.delete('onboarding');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    setForceOnboarding(true);
  }, [profileLoaded]);

  const showOnboardingGate = profileLoaded && (forceOnboarding || !onboardingComplete(profile));

  async function handleSaveProfileSetup(next: ReturnType<typeof normalizeUserProfile>) {
    return saveProfile(next, { completeStudioSetup: true });
  }

  function closeOnboardingGate() {
    setForceOnboarding(false);
  }

  if (!configured) return <SetupRequired />;
  if (loading || !profileLoaded) {
    return (
      <main className="app-loading">
        <p>Loading…</p>
      </main>
    );
  }

  if (profileLoadError) {
    return (
      <main className="app-loading">
        <h1>Something went wrong</h1>
        <p>{profileLoadError}</p>
        <button type="button" onClick={() => window.location.reload()}>
          Refresh
        </button>
      </main>
    );
  }

  if (showOnboardingGate) {
    return (
      <AppOnboardingGate
        profile={profile}
        profileLoaded={profileLoaded}
        profileSaving={saveStatus === 'saving'}
        fromWelcome={forceOnboarding}
        onComplete={closeOnboardingGate}
        onSaveProfile={handleSaveProfileSetup}
        onCompleteSetup={completeStudioSetup}
      />
    );
  }

  async function handleGenerate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setResult(null);

    if (!accessToken) {
      setError('Your session expired. Please sign in again.');
      router.replace('/login');
      return;
    }

    setGenerating(true);

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const parsed = await parseApiError(response);
        if (parsed.kind === 'auth') {
          await supabase?.auth.signOut();
          router.replace('/login');
        }
        setError(parsed.message);
        return;
      }

      const data = await response.json();
      setResult(data.result ?? '');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <h1>__APP_NAME__</h1>
          <p>Replace this page with your product UI.</p>
        </div>
        <div className="app-header-actions">
          <button type="button" className="app-secondary" onClick={() => setForceOnboarding(true)}>
            Profile setup
          </button>
          <button type="button" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      <form className="app-form" onSubmit={handleGenerate}>
        <label>
          Test prompt
          <textarea
            required
            rows={6}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Enter a prompt to verify /api/ai/generate works end-to-end…"
          />
        </label>

        {error ? (
          <p role="alert" className="app-error">
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={generating}>
          {generating ? 'Generating…' : 'Generate'}
        </button>
      </form>

      {result ? (
        <section className="app-result">
          <h2>Result</h2>
          <pre>{result}</pre>
        </section>
      ) : null}
    </main>
  );
}
