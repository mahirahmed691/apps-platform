'use client';

import { FormEvent, useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ConnectLinkedInButton } from '@/components/LinkedInSignInButton';
import { UserAvatar } from '@/components/UserAvatar';
import {
  PROFILE_FIELD_LABELS,
  getProfileFirstName,
  hasLinkedInImport,
  listLinkedInImportedFields,
  normalizeUserProfile,
  sanitizeProfileForSetup,
  type UserProfile,
} from '@/lib/userProfile';

type ProfileSetupCardProps = {
  profile: UserProfile;
  saving?: boolean;
  supabase?: SupabaseClient | null;
  siteUrl?: string;
  onContinue: (profile: UserProfile) => Promise<boolean>;
  onLinkedInImported?: () => void;
};

export function ProfileSetupCard({
  profile,
  saving = false,
  supabase,
  siteUrl = '',
  onContinue,
  onLinkedInImported,
}: ProfileSetupCardProps) {
  const [draft, setDraft] = useState<UserProfile>(() => sanitizeProfileForSetup(profile));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(sanitizeProfileForSetup(profile));
  }, [profile]);

  const firstName = getProfileFirstName(draft);
  const importedFields = listLinkedInImportedFields(profile);
  const linkedInConnected = hasLinkedInImport(profile);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!draft.fullName.trim()) {
      setError('Add your full name — it goes at the top of your CV.');
      return;
    }
    if (!draft.location.trim()) {
      setError('Add your location — city and country is enough.');
      return;
    }
    if (!draft.headline.trim()) {
      setError('Add a headline — the kind of role you want, e.g. Senior Product Manager.');
      return;
    }

    const ok = await onContinue(normalizeUserProfile(draft));
    if (!ok) setError('Could not save your details. Try again.');
  }

  function updateField<K extends keyof UserProfile>(key: K, value: UserProfile[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="profile-setup-card" role="region" aria-labelledby="profile-setup-title">
      <div className="profile-setup-header">
        <UserAvatar
          name={draft.fullName}
          email={draft.email}
          avatarUrl={draft.avatarUrl}
          size="md"
          className="profile-setup-avatar"
        />
        <div>
          <p className="profile-setup-kicker">
            {linkedInConnected ? 'LinkedIn connected' : 'Before we start'}
          </p>
          <h3 id="profile-setup-title" className="profile-setup-title">
            {firstName ? `Hi ${firstName} — confirm your details` : 'Your CV basics'}
          </h3>
          <p className="profile-setup-copy">
            Fill this in once. Ceevie uses it on every CV and skips these questions in the interview.
          </p>
        </div>
      </div>

      {importedFields.length > 0 && (
        <p className="profile-setup-imported">
          From LinkedIn: {importedFields.join(' · ')}
        </p>
      )}

      {!linkedInConnected && supabase && siteUrl && (
        <div className="profile-setup-linkedin">
          <p className="profile-setup-linkedin-copy">
            Connect LinkedIn to prefill your name, photo, and profile link.
          </p>
          <ConnectLinkedInButton
            supabase={supabase}
            siteUrl={siteUrl}
            linked={false}
            synced={false}
            onConnected={onLinkedInImported}
          />
        </div>
      )}

      <form className="profile-setup-form" onSubmit={handleSubmit}>
        <label className="profile-setup-field">
          <span>{PROFILE_FIELD_LABELS.fullName}</span>
          <input
            className="profile-setup-input"
            value={draft.fullName}
            onChange={(event) => updateField('fullName', event.target.value)}
            placeholder="e.g. Sarah Ahmed"
            autoComplete="name"
            required
          />
        </label>

        <label className="profile-setup-field">
          <span>Email</span>
          <input className="profile-setup-input profile-setup-input-readonly" value={draft.email} readOnly />
        </label>

        <label className="profile-setup-field">
          <span>{PROFILE_FIELD_LABELS.location}</span>
          <input
            className="profile-setup-input"
            value={draft.location}
            onChange={(event) => updateField('location', event.target.value)}
            placeholder="e.g. Manchester, UK"
            autoComplete="address-level2"
            required
          />
        </label>

        <label className="profile-setup-field">
          <span>{PROFILE_FIELD_LABELS.headline}</span>
          <input
            className="profile-setup-input"
            value={draft.headline}
            onChange={(event) => updateField('headline', event.target.value)}
            placeholder="e.g. Senior Product Manager in fintech"
            required
          />
        </label>

        <label className="profile-setup-field">
          <span>
            {PROFILE_FIELD_LABELS.phone}
            <em className="profile-setup-optional">optional</em>
          </span>
          <input
            className="profile-setup-input"
            value={draft.phone}
            onChange={(event) => updateField('phone', event.target.value)}
            placeholder="e.g. 07700 900123"
            autoComplete="tel"
          />
        </label>

        {draft.linkedinUrl.trim() && (
          <label className="profile-setup-field">
            <span>{PROFILE_FIELD_LABELS.linkedinUrl}</span>
            <input className="profile-setup-input profile-setup-input-readonly" value={draft.linkedinUrl} readOnly />
          </label>
        )}

        {error && (
          <p className="profile-setup-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-primary profile-setup-submit" disabled={saving}>
          {saving ? 'Saving…' : 'Continue to interview'}
        </button>
      </form>
    </div>
  );
}
