'use client';

import { FormEvent, useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ConnectLinkedInButton } from '@/components/LinkedInSignInButton';
import { UserAvatar } from '@/components/UserAvatar';
import { PROFILE_FIELD_LABELS, countProfileFields, type UserProfile } from '@/lib/userProfile';
import type { ProfileSaveStatus } from '@/hooks/useUserProfile';

type ProfilePanelProps = {
  open: boolean;
  profile: UserProfile;
  saveStatus: ProfileSaveStatus;
  supabase: SupabaseClient | null;
  siteUrl: string;
  accessToken?: string;
  linkedInLinked?: boolean;
  onClose: () => void;
  onSave: (profile: UserProfile) => Promise<boolean>;
  onLinkedInSynced?: () => void;
};

export function ProfilePanel({
  open,
  profile,
  saveStatus,
  supabase,
  siteUrl,
  linkedInLinked = false,
  accessToken,
  onClose,
  onSave,
  onLinkedInSynced,
}: ProfilePanelProps) {
  const [draft, setDraft] = useState<UserProfile>(profile);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(profile);
      setError(null);
    }
  }, [open, profile]);

  useEffect(() => {
    if (!open) return undefined;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const filledCount = countProfileFields(draft);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!draft.fullName.trim()) {
      setError('Add your full name so Ceevie can put it on your CV.');
      return;
    }

    const ok = await onSave(draft);
    if (ok) onClose();
    else setError('Could not save your profile. Try again.');
  }

  function updateField<K extends keyof UserProfile>(key: K, value: UserProfile[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="profile-sheet-root" role="presentation">
      <button type="button" className="profile-sheet-backdrop" aria-label="Close profile" onClick={onClose} />
      <aside className="profile-sheet" role="dialog" aria-modal="true" aria-labelledby="profile-sheet-title">
        <div className="profile-sheet-header">
          <div className="profile-sheet-header-main">
            <UserAvatar
              name={draft.fullName}
              email={draft.email}
              avatarUrl={draft.avatarUrl}
              size="md"
              className="profile-sheet-avatar"
            />
            <div>
              <p className="profile-sheet-kicker">Your details</p>
              <h2 id="profile-sheet-title">Profile</h2>
              <p className="profile-sheet-subtitle">
                Save the basics once. Ceevie reuses them every time you build a CV.
              </p>
            </div>
          </div>
          <button type="button" className="btn btn-ghost btn-icon" aria-label="Close profile" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="profile-sheet-meta">
          <span>{filledCount}/6 details saved</span>
          {(profile.linkedinConnectedAt || linkedInLinked) && (
            <span className="profile-sheet-meta-ok">
              {profile.linkedinConnectedAt ? 'LinkedIn imported' : 'LinkedIn linked'}
            </span>
          )}
          {saveStatus === 'saving' && <span>Saving…</span>}
          {saveStatus === 'saved' && <span className="profile-sheet-meta-ok">Saved</span>}
          {saveStatus === 'error' && <span className="profile-sheet-meta-error">Save failed</span>}
        </div>

        {supabase && (
          <ConnectLinkedInButton
            supabase={supabase}
            siteUrl={siteUrl}
            linked={linkedInLinked || Boolean(profile.linkedinConnectedAt)}
            synced={Boolean(profile.linkedinConnectedAt)}
            onConnected={onLinkedInSynced}
          />
        )}

        <form className="profile-sheet-form" onSubmit={handleSubmit}>
          <label className="profile-field">
            <span>{PROFILE_FIELD_LABELS.fullName}</span>
            <input
              className="profile-input"
              value={draft.fullName}
              onChange={(event) => updateField('fullName', event.target.value)}
              placeholder="e.g. Sarah Ahmed"
              autoComplete="name"
              required
            />
          </label>

          <label className="profile-field">
            <span>Email</span>
            <input className="profile-input profile-input-readonly" value={draft.email} readOnly />
          </label>

          <label className="profile-field">
            <span>{PROFILE_FIELD_LABELS.phone}</span>
            <input
              className="profile-input"
              value={draft.phone}
              onChange={(event) => updateField('phone', event.target.value)}
              placeholder="e.g. 07700 900123"
              autoComplete="tel"
            />
          </label>

          <label className="profile-field">
            <span>{PROFILE_FIELD_LABELS.location}</span>
            <input
              className="profile-input"
              value={draft.location}
              onChange={(event) => updateField('location', event.target.value)}
              placeholder="e.g. Manchester, UK"
              autoComplete="address-level2"
            />
          </label>

          <label className="profile-field">
            <span>{PROFILE_FIELD_LABELS.linkedinUrl}</span>
            <input
              className="profile-input"
              value={draft.linkedinUrl}
              onChange={(event) => updateField('linkedinUrl', event.target.value)}
              placeholder="https://linkedin.com/in/your-name"
              inputMode="url"
            />
          </label>

          <label className="profile-field">
            <span>{PROFILE_FIELD_LABELS.portfolioUrl}</span>
            <input
              className="profile-input"
              value={draft.portfolioUrl}
              onChange={(event) => updateField('portfolioUrl', event.target.value)}
              placeholder="https://your-site.com"
              inputMode="url"
            />
          </label>

          <label className="profile-field">
            <span>{PROFILE_FIELD_LABELS.headline}</span>
            <input
              className="profile-input"
              value={draft.headline}
              onChange={(event) => updateField('headline', event.target.value)}
              placeholder="e.g. Senior Product Manager in fintech"
            />
          </label>

          {error && (
            <p className="profile-sheet-error" role="alert">
              {error}
            </p>
          )}

          {accessToken ? (
            <div className="profile-privacy-block">
              <h3>Privacy & data</h3>
              <p className="profile-sheet-copy">Export or delete your Ceevie data at any time.</p>
              <div className="profile-sheet-actions profile-sheet-actions-stack">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={async () => {
                    const res = await fetch('/api/account/data', { headers: { Authorization: `Bearer ${accessToken}` } });
                    const data = await res.json();
                    const blob = new Blob([JSON.stringify(data.export, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'ceevie-profile-export.json';
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Export my data
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm app-nav-sheet-link-danger"
                  onClick={async () => {
                    if (!window.confirm('Delete all saved CV drafts, exports, and profile fields?')) return;
                    await fetch('/api/account/data', { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } });
                    onClose();
                  }}
                >
                  Delete my data
                </button>
              </div>
            </div>
          ) : null}

          <div className="profile-sheet-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saveStatus === 'saving'}>
              {saveStatus === 'saving' ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
