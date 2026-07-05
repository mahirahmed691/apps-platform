'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LoadingScreen } from '@/components/LoadingScreen';
import { SetupRequired } from '@/components/SetupRequired';
import { useAuth } from '@/hooks/useAuth';
import { useRecruiter } from '@/hooks/useRecruiter';

function statusLabel(status: string) {
  if (status === 'active') return 'Active';
  if (status === 'closed') return 'Closed';
  return 'Draft';
}

export default function RecruiterDashboardPage() {
  const router = useRouter();
  const [copiedBriefId, setCopiedBriefId] = useState<string | null>(null);
  const { session, loading: authLoading, configured, signOut } = useAuth({ requireAuth: true });
  const accessToken = session?.access_token;
  const { info, briefs, loading, activating, error, activate, refresh } = useRecruiter(accessToken);

  if (!configured) return <SetupRequired />;
  if (authLoading || loading) return <LoadingScreen message="Loading recruiter dashboard…" />;

  if (!info?.isRecruiter) {
    return (
      <div className="recruiter-shell ceevie-dark-shell">
        <header className="recruiter-header">
          <div>
            <p className="recruiter-kicker">Ceevie for recruiters</p>
            <h1>Send candidates a voice interview, not a blank form</h1>
            <p className="recruiter-lead">
              Create a role brief, share one invite link, and review tailored CVs as candidates finish their
              interview.
            </p>
          </div>
        </header>

        <section className="recruiter-card recruiter-activate-card">
          <h2>Activate recruiter workspace</h2>
          <p>Turn on recruiter tools on your existing Ceevie account. You can also choose Recruiter when you sign up.</p>
          {error ? <p className="recruiter-error">{error}</p> : null}
          <div className="recruiter-actions">
            <button type="button" className="btn btn-primary" onClick={() => void activate()} disabled={activating}>
              {activating ? 'Activating…' : 'Enable recruiter mode'}
            </button>
            <Link href="/" className="btn btn-ghost">
              Back to studio
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="recruiter-shell ceevie-dark-shell">
      <header className="recruiter-header recruiter-header-row">
        <div>
          <p className="recruiter-kicker">Recruiter dashboard</p>
          <h1>Role briefs</h1>
          <p className="recruiter-lead">Create an invite link for each role and track candidate progress.</p>
        </div>
        <div className="recruiter-header-actions">
          <Link href="/recruiter/briefs/new" className="btn btn-primary">
            New role brief
          </Link>
          <Link href="/" className="btn btn-ghost">
            Candidate studio
          </Link>
          <button type="button" className="btn btn-ghost" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </header>

      {error ? <p className="recruiter-error">{error}</p> : null}

      {briefs.length === 0 ? (
        <section className="recruiter-card recruiter-empty">
          <h2>No briefs yet</h2>
          <p>Create your first role brief to generate an invite link for candidates.</p>
          <Link href="/recruiter/briefs/new" className="btn btn-primary">
            Create role brief
          </Link>
        </section>
      ) : (
        <div className="recruiter-brief-grid">
          {briefs.map((brief) => (
            <article key={brief.id} className="recruiter-card recruiter-brief-card">
              <div className="recruiter-brief-card-head">
                <div>
                  <h2>{brief.title}</h2>
                  {brief.company ? <p className="recruiter-brief-company">{brief.company}</p> : null}
                </div>
                <span className={`recruiter-status recruiter-status-${brief.status}`}>{statusLabel(brief.status)}</span>
              </div>
              <dl className="recruiter-stats">
                <div>
                  <dt>Invited</dt>
                  <dd>{brief.redemptionCount}</dd>
                </div>
                <div>
                  <dt>Completed</dt>
                  <dd>{brief.completedCount}</dd>
                </div>
                <div>
                  <dt>Approved</dt>
                  <dd>{brief.approvedCount}</dd>
                </div>
              </dl>
              <div className="recruiter-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => router.push(`/recruiter/briefs/${brief.id}`)}
                >
                  View candidates
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={async () => {
                    await navigator.clipboard.writeText(brief.inviteUrl);
                    setCopiedBriefId(brief.id);
                    window.setTimeout(() => setCopiedBriefId(null), 2000);
                  }}
                >
                  {copiedBriefId === brief.id ? 'Copied' : 'Copy invite link'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <button type="button" className="btn btn-ghost recruiter-refresh" onClick={() => void refresh()}>
        Refresh
      </button>
    </div>
  );
}
