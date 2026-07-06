'use client';

import type { UserProfile } from '@/lib/userProfile';
import { PROFILE_FIELD_LABELS } from '@/lib/userProfile';

type CvContactBarProps = {
  profile: UserProfile;
  editable?: boolean;
  onProfileChange?: (patch: Partial<UserProfile>) => void;
};

type ContactField = 'email' | 'phone' | 'location' | 'linkedinUrl' | 'portfolioUrl';

const FIELD_ORDER: ContactField[] = ['email', 'phone', 'location', 'linkedinUrl', 'portfolioUrl'];

const CONTACT_LABELS: Record<ContactField, string> = {
  email: 'Email',
  phone: PROFILE_FIELD_LABELS.phone,
  location: PROFILE_FIELD_LABELS.location,
  linkedinUrl: PROFILE_FIELD_LABELS.linkedinUrl,
  portfolioUrl: PROFILE_FIELD_LABELS.portfolioUrl,
};

export function CvContactBar({ profile, editable = false, onProfileChange }: CvContactBarProps) {
  const hasAny = FIELD_ORDER.some((key) => profile[key]?.trim());

  if (!editable && !hasAny) return null;

  if (!editable) {
    const parts = FIELD_ORDER.map((key) => profile[key]?.trim()).filter(Boolean);
    if (!parts.length) return null;
    return (
      <p className="preview-doc-contact-line" id="preview-section-contact">
        {parts.join(' · ')}
      </p>
    );
  }

  return (
    <div className="preview-doc-contact-bar" id="preview-section-contact">
      {FIELD_ORDER.map((key) => (
        <label key={key} className="preview-doc-contact-field">
          <span>{CONTACT_LABELS[key]}</span>
          <input
            type={key === 'email' ? 'email' : 'text'}
            value={profile[key]}
            onChange={(event) => onProfileChange?.({ [key]: event.target.value })}
            placeholder={CONTACT_LABELS[key]}
          />
        </label>
      ))}
    </div>
  );
}
