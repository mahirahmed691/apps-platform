'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { LoadingScreen } from '@/components/LoadingScreen';
import { SetupRequired } from '@/components/SetupRequired';
import { useAuth } from '@/hooks/useAuth';
import type { PublicRoleBrief } from '@/lib/roleBrief';

export default function InviteLandingPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params.token;

  const { session, loading: authLoading, configured } = useAuth();
  const accessToken = session?.access_token;

  const [brief, setBrief] = useState<PublicRoleBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBrief = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/invite/${encodeURIComponent(token)}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? 'Invite not found');
        setBrief(null);
        return;
      }

      setBrief(data.brief);
    } catch {
      setError('Could not load this invite.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadBrief();
  }, [loadBrief]);

  async function handleAccept() {
    if (!token) return;

    if (!accessToken) {
      router.push(`/login?next=${encodeURIComponent(`/i/${token}`)}`);
      return;
    }

    setAccepting(true);
    setError(null);

    try {
      const response = await fetch(`/api/invite/${encodeURIComponent(token)}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? 'Could not accept invite');
        return;
      }

      router.push('/?invite=accepted');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setAccepting(false);
    }
  }

  if (!configured) return <SetupRequired />;
  if (loading || authLoading) return <LoadingScreen message="Loading invite…" />;

  if (!brief) {
    return (
      <div className="invite-shell ceevie-dark-shell">
        <section className="invite-card">
          <h1>Invite unavailable</h1>
          <p>{error ?? 'This invite link is invalid or has expired.'}</p>
          <Link href="/" className="btn btn-primary">
            Go to Ceevie
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="invite-shell ceevie-dark-shell">
      <section className="invite-card">
        <p className="invite-kicker">You&apos;re invited to build a tailored CV</p>
        <h1>{brief.title}</h1>
        {brief.company ? <p className="invite-company">{brief.company}</p> : null}

        {brief.description ? <p className="invite-copy">{brief.description}</p> : null}

        {brief.requirements ? (
          <div className="invite-requirements">
            <h2>What they&apos;re looking for</h2>
            <p>{brief.requirements}</p>
          </div>
        ) : null}

        <p className="invite-footnote">
          Ceevie will interview you by voice and shape your CV around this role. It takes a few minutes — no blank
          templates.
        </p>

        {error ? <p className="recruiter-error">{error}</p> : null}

        <div className="invite-actions">
          <button type="button" className="btn btn-primary" onClick={() => void handleAccept()} disabled={accepting}>
            {accepting ? 'Starting…' : accessToken ? 'Start tailored interview' : 'Sign in to start'}
          </button>
          {!accessToken ? (
            <Link href={`/login?next=${encodeURIComponent(`/i/${token}`)}`} className="btn btn-ghost">
              Already have an account
            </Link>
          ) : null}
        </div>
      </section>
    </div>
  );
}
