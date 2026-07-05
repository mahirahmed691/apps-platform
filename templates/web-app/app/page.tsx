'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseApiError } from '@yourorg/app-core';
import { SetupRequired } from '@/components/SetupRequired';
import { useAuth } from '@/hooks/useAuth';

export default function Home() {
  const router = useRouter();
  const { session, loading, configured, supabase, signOut } = useAuth({ requireAuth: true });

  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  if (!configured) return <SetupRequired />;
  if (loading) {
    return (
      <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
        <p>Loading…</p>
      </main>
    );
  }

  async function handleGenerate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setResult(null);

    const accessToken = session?.access_token;
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
    <main style={{ padding: '2rem', fontFamily: 'system-ui', maxWidth: '48rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>__APP_NAME__</h1>
          <p style={{ margin: '0.25rem 0 0' }}>Replace this page with your product UI.</p>
        </div>
        <button type="button" onClick={signOut} style={{ padding: '0.5rem 0.75rem' }}>
          Sign out
        </button>
      </header>

      <form onSubmit={handleGenerate} style={{ display: 'grid', gap: '1rem', marginTop: '1.5rem' }}>
        <label style={{ display: 'grid', gap: '0.25rem' }}>
          Test prompt
          <textarea
            required
            rows={6}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Enter a prompt to verify /api/ai/generate works end-to-end…"
            style={{ padding: '0.5rem', resize: 'vertical' }}
          />
        </label>

        {error && (
          <p role="alert" style={{ color: '#b00020', margin: 0 }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={generating} style={{ padding: '0.625rem 1rem', width: 'fit-content' }}>
          {generating ? 'Generating…' : 'Generate'}
        </button>
      </form>

      {result && (
        <section style={{ marginTop: '2rem' }}>
          <h2>Result</h2>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#f5f5f5', padding: '1rem', borderRadius: '4px' }}>
            {result}
          </pre>
        </section>
      )}
    </main>
  );
}
