'use client';

import {
  getProfileFirstName,
  hasLinkedInImport,
  listLinkedInImportedFields,
  type UserProfile,
} from '@/lib/userProfile';

type LinkedInImportCardProps = {
  profile: UserProfile;
  onStart: () => void;
  onDismiss: () => void;
};

export function LinkedInImportCard({ profile, onStart, onDismiss }: LinkedInImportCardProps) {
  const firstName = getProfileFirstName(profile);
  const importedFields = listLinkedInImportedFields(profile);

  return (
    <div className="linkedin-import-card" role="region" aria-labelledby="linkedin-import-title">
      <div className="linkedin-import-card-header">
        <div className="linkedin-import-card-identity">
          {profile.avatarUrl ? (
            <img
              className="linkedin-import-avatar"
              src={profile.avatarUrl}
              alt=""
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="linkedin-import-avatar linkedin-import-avatar-fallback" aria-hidden="true">
              {(firstName || profile.fullName || 'L').slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <p className="linkedin-import-kicker">Imported from LinkedIn</p>
            <h3 id="linkedin-import-title" className="linkedin-import-title">
              {firstName ? `Welcome, ${firstName}` : 'LinkedIn connected'}
            </h3>
          </div>
        </div>
        <button type="button" className="btn btn-ghost btn-icon" aria-label="Dismiss" onClick={onDismiss}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <p className="linkedin-import-copy">
        We&apos;ve saved your basics. The voice interview will capture your experience, achievements, and skills —
        the parts LinkedIn doesn&apos;t provide.
      </p>

      <dl className="linkedin-import-details">
        {profile.fullName.trim() && (
          <>
            <dt>Name</dt>
            <dd>{profile.fullName}</dd>
          </>
        )}
        {profile.email.trim() && (
          <>
            <dt>Email</dt>
            <dd>{profile.email}</dd>
          </>
        )}
        {profile.location.trim() && (
          <>
            <dt>Location</dt>
            <dd>{profile.location}</dd>
          </>
        )}
        {profile.headline.trim() && (
          <>
            <dt>Headline</dt>
            <dd>{profile.headline}</dd>
          </>
        )}
        {profile.linkedinUrl.trim() && (
          <>
            <dt>LinkedIn</dt>
            <dd>{profile.linkedinUrl}</dd>
          </>
        )}
      </dl>

      {importedFields.length > 0 && (
        <p className="linkedin-import-meta">
          Imported: {importedFields.join(' · ')}
        </p>
      )}

      <div className="linkedin-import-actions">
        <button type="button" className="btn btn-primary" onClick={onStart}>
          Start CV interview
        </button>
      </div>
    </div>
  );
}

export function shouldShowLinkedInImportCard(profile: UserProfile, hasUserMessages: boolean): boolean {
  return hasLinkedInImport(profile) && !hasUserMessages;
}
