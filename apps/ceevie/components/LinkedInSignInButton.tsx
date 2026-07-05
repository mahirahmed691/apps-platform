'use client';

import { useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { connectLinkedIn, getAuthErrorMessage, signInWithLinkedIn } from '@yourorg/app-core';
import { syncLinkedInProfileFromClient } from '@/lib/linkedinSyncClient';

type LinkedInSignInButtonProps = {
  supabase: SupabaseClient;
  siteUrl: string;
  label?: string;
  className?: string;
};

export function LinkedInSignInButton({
  supabase,
  siteUrl,
  label = 'Continue with LinkedIn',
  className = 'btn btn-linkedin',
}: LinkedInSignInButtonProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setSubmitting(true);
    try {
      const { error: oauthError } = await signInWithLinkedIn(supabase, siteUrl);
      if (oauthError) setError(getAuthErrorMessage(oauthError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="oauth-block">
      <button type="button" className={className} onClick={handleClick} disabled={submitting}>
        <LinkedInIcon />
        {submitting ? 'Redirecting…' : label}
      </button>
      {error && (
        <p className="alert alert-error oauth-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

type ConnectLinkedInButtonProps = {
  supabase: SupabaseClient;
  siteUrl: string;
  /** LinkedIn OAuth identity is linked to this account. */
  linked?: boolean;
  /** Profile row has been synced from LinkedIn at least once. */
  synced?: boolean;
  onConnected?: () => void;
};

export function ConnectLinkedInButton({
  supabase,
  siteUrl,
  linked = false,
  synced = false,
  onConnected,
}: ConnectLinkedInButtonProps) {
  const [submitting, setSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleConnect() {
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      const { error: oauthError } = await connectLinkedIn(supabase, siteUrl);
      if (oauthError) setError(getAuthErrorMessage(oauthError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSync(accessToken: string) {
    setError(null);
    setInfo(null);
    setSyncing(true);
    try {
      const result = await syncLinkedInProfileFromClient(supabase, accessToken);
      if (!result.ok) {
        setError(result.error ?? 'LinkedIn import failed.');
        return;
      }

      const summary = result.importedSummary ? `Imported ${result.importedSummary}.` : '';
      const message = result.message ?? 'LinkedIn details imported.';
      setInfo(summary ? `${message} ${summary}` : message);
      onConnected?.();
    } finally {
      setSyncing(false);
    }
  }

  async function handleRefresh() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setError('Your session expired. Sign in again.');
      return;
    }
    await handleSync(token);
  }

  return (
    <div className="linkedin-connect-block">
      <div className="linkedin-connect-copy">
        <p className="linkedin-connect-title">LinkedIn</p>
        <p className="linkedin-connect-text">
          Import your name, email, photo, profile URL, and headline from LinkedIn. Add location manually in Profile.
        </p>
      </div>
      <div className="linkedin-connect-actions">
        {!linked ? (
          <button type="button" className="btn btn-linkedin btn-sm" onClick={handleConnect} disabled={submitting}>
            {submitting ? 'Redirecting…' : 'Connect LinkedIn'}
          </button>
        ) : (
          <>
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleRefresh} disabled={syncing}>
              {syncing ? 'Importing…' : synced ? 'Refresh from LinkedIn' : 'Import from LinkedIn'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={handleConnect} disabled={submitting}>
              Re-authorize
            </button>
          </>
        )}
      </div>
      {info && (
        <p className="alert alert-info linkedin-connect-alert" role="status">
          {info}
        </p>
      )}
      {error && (
        <p className="alert alert-error linkedin-connect-alert" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function LinkedInIcon() {
  return (
    <svg className="linkedin-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M20.5 2h-17A1.5 1.5 0 0 0 2 3.5v17A1.5 1.5 0 0 0 3.5 22h17a1.5 1.5 0 0 0 1.5-1.5v-17A1.5 1.5 0 0 0 20.5 2ZM8 19H5v-9h3v9ZM6.5 8.25A1.75 1.75 0 1 1 8.25 6.5 1.75 1.75 0 0 1 6.5 8.25ZM19 19h-3v-4.64c0-1.24-.02-2.83-1.72-2.83-1.72 0-1.98 1.34-1.98 2.73V19h-3v-9h2.88v1.23h.04a3.15 3.15 0 0 1 2.85-1.57c3.05 0 3.61 2.01 3.61 4.62V19Z"
      />
    </svg>
  );
}
