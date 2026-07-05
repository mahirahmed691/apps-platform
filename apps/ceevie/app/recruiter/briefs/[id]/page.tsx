'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { LoadingScreen } from '@/components/LoadingScreen';
import { SetupRequired } from '@/components/SetupRequired';
import { useAuth } from '@/hooks/useAuth';
import type { InviteRedemption, RoleBrief } from '@/lib/roleBrief';

type BriefDetail = RoleBrief & { inviteUrl: string };

function redemptionStatusLabel(status: InviteRedemption['status']) {
  if (status === 'approved') return 'Approved';
  if (status === 'completed') return 'CV ready';
  return 'In progress';
}

export default function RoleBriefDetailPage() {
  const params = useParams<{ id: string }>();
  const briefId = params.id;
  const { session, loading: authLoading, configured } = useAuth({ requireAuth: true });
  const accessToken = session?.access_token;

  const [brief, setBrief] = useState<BriefDetail | null>(null);
  const [redemptions, setRedemptions] = useState<InviteRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedCvId, setExpandedCvId] = useState<string | null>(null);
  const [copiedCvId, setCopiedCvId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken || !briefId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/recruiter/briefs/${briefId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? 'Failed to load brief');
        return;
      }

      setBrief(data.brief);
      setRedemptions(data.redemptions ?? []);
    } catch {
      setError('Something went wrong loading this brief.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, briefId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleApprove(redemption: InviteRedemption) {
    if (!accessToken || !briefId) return;

    setUpdatingId(redemption.id);
    try {
      const response = await fetch(`/api/recruiter/briefs/${briefId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ redemptionId: redemption.id, status: 'approved' }),
      });

      if (response.ok) {
        await load();
      }
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleCloseBrief() {
    if (!accessToken || !briefId) return;

    await fetch(`/api/recruiter/briefs/${briefId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ status: 'closed' }),
    });
    await load();
  }

  if (!configured) return <SetupRequired />;
  if (authLoading || loading) return <LoadingScreen message="Loading brief…" />;
  if (!brief) {
    return (
      <div className="recruiter-shell ceevie-dark-shell">
        <p className="recruiter-error">{error ?? 'Brief not found'}</p>
        <Link href="/recruiter" className="btn btn-ghost">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="recruiter-shell ceevie-dark-shell">
      <header className="recruiter-header">
        <p className="recruiter-kicker">Role brief</p>
        <h1>{brief.title}</h1>
        {brief.company ? <p className="recruiter-lead">{brief.company}</p> : null}
      </header>

      <section className="recruiter-card">
        <h2>Invite link</h2>
        <p className="recruiter-invite-url">{brief.inviteUrl}</p>
        <div className="recruiter-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={async () => {
              await navigator.clipboard.writeText(brief.inviteUrl);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? 'Copied' : 'Copy link'}
          </button>
          {brief.status === 'active' ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void handleCloseBrief()}>
              Close brief
            </button>
          ) : null}
          <Link href="/recruiter" className="btn btn-ghost btn-sm">
            Back
          </Link>
        </div>
      </section>

      {brief.description ? (
        <section className="recruiter-card">
          <h2>Overview</h2>
          <p className="recruiter-copy">{brief.description}</p>
        </section>
      ) : null}

      {brief.requirements ? (
        <section className="recruiter-card">
          <h2>Requirements</h2>
          <p className="recruiter-copy">{brief.requirements}</p>
        </section>
      ) : null}

      <section className="recruiter-card">
        <h2>Candidates</h2>
        {redemptions.length === 0 ? (
          <p className="recruiter-copy">No one has accepted this invite yet. Share the link to get started.</p>
        ) : (
          <ul className="recruiter-candidate-list">
            {redemptions.map((redemption) => (
              <li key={redemption.id} className="recruiter-candidate-item">
                <div>
                  <strong>{redemption.candidateName || redemption.candidateEmail || 'Candidate'}</strong>
                  {redemption.candidateEmail ? <span>{redemption.candidateEmail}</span> : null}
                </div>
                <div className="recruiter-candidate-meta">
                  <span className={`recruiter-status recruiter-status-${redemption.status}`}>
                    {redemptionStatusLabel(redemption.status)}
                  </span>
                  {redemption.generatedCv ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() =>
                          setExpandedCvId((current) => (current === redemption.id ? null : redemption.id))
                        }
                      >
                        {expandedCvId === redemption.id ? 'Hide CV' : 'View CV'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={async () => {
                          await navigator.clipboard.writeText(redemption.generatedCv ?? '');
                          setCopiedCvId(redemption.id);
                          window.setTimeout(() => setCopiedCvId(null), 2000);
                        }}
                      >
                        {copiedCvId === redemption.id ? 'Copied' : 'Copy CV'}
                      </button>
                    </>
                  ) : null}
                  {redemption.status === 'completed' ? (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={updatingId === redemption.id}
                      onClick={() => void handleApprove(redemption)}
                    >
                      {updatingId === redemption.id ? 'Saving…' : 'Approve'}
                    </button>
                  ) : null}
                </div>
                {expandedCvId === redemption.id && redemption.generatedCv ? (
                  <pre className="recruiter-candidate-cv">{redemption.generatedCv}</pre>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
