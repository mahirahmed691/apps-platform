'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingScreen } from '@/components/LoadingScreen';
import { SetupRequired } from '@/components/SetupRequired';
import { useAuth } from '@/hooks/useAuth';
import { useRecruiter } from '@/hooks/useRecruiter';

export default function NewRoleBriefPage() {
  const router = useRouter();
  const { session, loading: authLoading, configured } = useAuth({ requireAuth: true });
  const accessToken = session?.access_token;
  const { info, loading, error: recruiterError } = useRecruiter(accessToken);

  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !title.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/recruiter/briefs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ title, company, description, requirements }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? 'Failed to create brief');
        return;
      }

      router.push(`/recruiter/briefs/${data.brief.id}`);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (!loading && info && !info.isRecruiter) {
      router.replace('/recruiter');
    }
  }, [loading, info, router]);

  if (!configured) return <SetupRequired />;
  if (authLoading || loading) return <LoadingScreen message="Loading…" />;
  if (!info?.isRecruiter) return <LoadingScreen message="Redirecting…" />;

  return (
    <div className="recruiter-shell ceevie-dark-shell">
      <header className="recruiter-header">
        <p className="recruiter-kicker">New role brief</p>
        <h1>Describe the role candidates should tailor for</h1>
        <p className="recruiter-lead">
          This brief pre-fills the candidate interview and shapes follow-up questions around your posting.
        </p>
      </header>

      <form className="recruiter-card recruiter-form" onSubmit={handleSubmit}>
        <label className="recruiter-field">
          <span>Role title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Senior Product Manager" required />
        </label>
        <label className="recruiter-field">
          <span>Company</span>
          <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Acme Ltd" />
        </label>
        <label className="recruiter-field">
          <span>Role overview</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="What the role is about, team context, and what success looks like."
          />
        </label>
        <label className="recruiter-field">
          <span>Requirements</span>
          <textarea
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            rows={5}
            placeholder="Must-have skills, experience, certifications, or keywords to mirror in the CV."
          />
        </label>

        {error || recruiterError ? <p className="recruiter-error">{error ?? recruiterError}</p> : null}

        <div className="recruiter-actions">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create invite link'}
          </button>
          <Link href="/recruiter" className="btn btn-ghost">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
