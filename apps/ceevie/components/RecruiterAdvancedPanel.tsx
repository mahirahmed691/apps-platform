'use client';

import { FormEvent, useState } from 'react';
import type { InviteRedemption } from '@/lib/roleBrief';

type RecruiterAdvancedPanelProps = {
  accessToken?: string;
  briefId: string;
  redemptions: InviteRedemption[];
  onRefresh: () => void;
  branding?: {
    brandName?: string;
    logoUrl?: string;
    accentColor?: string;
    welcomeMessage?: string;
  };
  onSaveBranding?: (values: {
    brandName: string;
    logoUrl: string;
    accentColor: string;
    welcomeMessage: string;
  }) => Promise<void>;
};

const PIPELINE_STAGES = ['applied', 'screening', 'shortlist', 'interview', 'offer', 'rejected'];

export function RecruiterAdvancedPanel({
  accessToken,
  briefId,
  redemptions,
  onRefresh,
  branding,
  onSaveBranding,
}: RecruiterAdvancedPanelProps) {
  const [emails, setEmails] = useState('');
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [brandName, setBrandName] = useState(branding?.brandName ?? '');
  const [logoUrl, setLogoUrl] = useState(branding?.logoUrl ?? '');
  const [accentColor, setAccentColor] = useState(branding?.accentColor ?? '#ffffff');
  const [welcomeMessage, setWelcomeMessage] = useState(branding?.welcomeMessage ?? '');
  const [busy, setBusy] = useState(false);

  async function patchRedemption(redemptionId: string, payload: Record<string, unknown>) {
    if (!accessToken) return;
    await fetch(`/api/recruiter/briefs/${briefId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ redemptionId, ...payload }),
    });
    onRefresh();
  }

  async function handleBulkInvite(event: FormEvent) {
    event.preventDefault();
    if (!accessToken) return;
    setBusy(true);
    try {
      const list = emails.split(/[\n,;]+/).map((email) => email.trim()).filter(Boolean);
      await fetch(`/api/recruiter/briefs/${briefId}/bulk-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ emails: list }),
      });
      setEmails('');
      onRefresh();
    } finally {
      setBusy(false);
    }
  }

  const compareCandidates = redemptions.filter((r) => compareIds.includes(r.id) && r.generatedCv);

  return (
    <div className="recruiter-advanced">
      <section className="recruiter-card">
        <h2>Branded invite page</h2>
        <form
          className="recruiter-form"
          onSubmit={(event) => {
            event.preventDefault();
            void onSaveBranding?.({ brandName, logoUrl, accentColor, welcomeMessage });
          }}
        >
          <label className="recruiter-field"><span>Brand name</span><input value={brandName} onChange={(e) => setBrandName(e.target.value)} /></label>
          <label className="recruiter-field"><span>Logo URL</span><input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} /></label>
          <label className="recruiter-field"><span>Accent colour</span><input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} /></label>
          <label className="recruiter-field"><span>Welcome message</span><textarea value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} rows={3} /></label>
          <button type="submit" className="btn btn-secondary btn-sm">Save branding</button>
        </form>
      </section>

      <section className="recruiter-card">
        <h2>Bulk email invites</h2>
        <form className="recruiter-form" onSubmit={handleBulkInvite}>
          <label className="recruiter-field">
            <span>Emails</span>
            <textarea value={emails} onChange={(e) => setEmails(e.target.value)} rows={4} placeholder="one@company.com, two@company.com" />
          </label>
          <button type="submit" className="btn btn-secondary btn-sm" disabled={busy}>{busy ? 'Sending…' : 'Send invites'}</button>
        </form>
      </section>

      <section className="recruiter-card">
        <h2>Pipeline & notes</h2>
        <ul className="recruiter-candidate-list">
          {redemptions.map((redemption) => (
            <li key={redemption.id} className="recruiter-candidate-item">
              <div>
                <strong>{redemption.candidateName || redemption.candidateEmail || 'Candidate'}</strong>
                <select
                  value={redemption.pipelineStage ?? 'applied'}
                  onChange={(e) => void patchRedemption(redemption.id, { pipelineStage: e.target.value })}
                >
                  {PIPELINE_STAGES.map((stage) => (
                    <option key={stage} value={stage}>{stage}</option>
                  ))}
                </select>
              </div>
              <div className="recruiter-candidate-meta">
                <input
                  defaultValue={redemption.recruiterNotes}
                  placeholder="Notes"
                  onBlur={(e) => void patchRedemption(redemption.id, { recruiterNotes: e.target.value, status: redemption.status })}
                />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCompareIds((ids) => (ids.includes(redemption.id) ? ids.filter((id) => id !== redemption.id) : [...ids, redemption.id].slice(-3)))}>
                  {compareIds.includes(redemption.id) ? 'Remove compare' : 'Compare'}
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => void patchRedemption(redemption.id, { status: 'rejected', rejectionReason: 'Not a fit for this role' })}>
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {compareCandidates.length >= 2 && (
        <section className="recruiter-card">
          <h2>Candidate comparison</h2>
          <div className="recruiter-compare-grid">
            {compareCandidates.map((candidate) => (
              <div key={candidate.id}>
                <h3>{candidate.candidateName || candidate.candidateEmail}</h3>
                <pre className="recruiter-candidate-cv">{candidate.generatedCv}</pre>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="recruiter-card">
        <h2>Recruiter billing</h2>
        <p className="recruiter-copy">Upgrade for team seats, branded invites, and bulk outreach.</p>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={async () => {
            if (!accessToken) return;
            const res = await fetch('/api/stripe/recruiter-checkout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
              body: JSON.stringify({ successUrl: `${window.location.origin}/recruiter?upgraded=1`, cancelUrl: window.location.href }),
            });
            const data = await res.json();
            if (data.url) window.location.href = data.url;
          }}
        >
          Upgrade recruiter plan
        </button>
      </section>
    </div>
  );
}
