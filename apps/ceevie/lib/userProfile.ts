export type UserProfile = {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedinUrl: string;
  portfolioUrl: string;
  headline: string;
  avatarUrl?: string;
  linkedinConnectedAt?: string | null;
};

export const EMPTY_USER_PROFILE: UserProfile = {
  fullName: '',
  email: '',
  phone: '',
  location: '',
  linkedinUrl: '',
  portfolioUrl: '',
  headline: '',
  avatarUrl: '',
};

export const PROFILE_FIELD_LABELS: Record<
  keyof Omit<UserProfile, 'email' | 'linkedinConnectedAt' | 'avatarUrl'>,
  string
> = {
  fullName: 'Full name',
  phone: 'Phone',
  location: 'Location',
  linkedinUrl: 'LinkedIn',
  portfolioUrl: 'Portfolio or website',
  headline: 'Professional headline',
};

export function normalizeUserProfile(profile?: Partial<UserProfile> | null): UserProfile {
  return {
    fullName: profile?.fullName?.trim() ?? '',
    email: profile?.email?.trim() ?? '',
    phone: profile?.phone?.trim() ?? '',
    location: profile?.location?.trim() ?? '',
    linkedinUrl: profile?.linkedinUrl?.trim() ?? '',
    portfolioUrl: profile?.portfolioUrl?.trim() ?? '',
    headline: profile?.headline?.trim() ?? '',
    avatarUrl: profile?.avatarUrl?.trim() ?? '',
    linkedinConnectedAt: profile?.linkedinConnectedAt ?? null,
  };
}

export function countProfileFields(profile: UserProfile): number {
  const safe = normalizeUserProfile(profile);
  return [
    safe.fullName,
    safe.phone,
    safe.location,
    safe.linkedinUrl,
    safe.portfolioUrl,
    safe.headline,
  ].filter((value) => value.trim()).length;
}

export function profileToCvPrefill(profile: UserProfile): { fullName?: string; targetRole?: string } {
  const safe = normalizeUserProfile(profile);
  const prefill: { fullName?: string; targetRole?: string } = {};
  if (safe.fullName) prefill.fullName = safe.fullName;
  if (safe.headline) prefill.targetRole = safe.headline;
  return prefill;
}

export function getProfileFirstName(profile: UserProfile): string {
  return normalizeUserProfile(profile).fullName.split(/\s+/)[0] ?? '';
}

export function listLinkedInImportedFields(profile: UserProfile): string[] {
  const safe = normalizeUserProfile(profile);
  const fields: string[] = [];
  if (safe.fullName) fields.push('Name');
  if (safe.email) fields.push('Email');
  if (safe.headline) fields.push('Headline');
  if (safe.linkedinUrl) fields.push('LinkedIn profile');
  if (safe.avatarUrl) fields.push('Photo');
  return fields;
}

export function hasLinkedInImport(profile: UserProfile): boolean {
  return Boolean(normalizeUserProfile(profile).linkedinConnectedAt);
}

export function looksLikeLocaleOnlyLocation(location: string): boolean {
  const value = location.trim();
  if (!value || value.includes(',')) return false;

  try {
    const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
    for (const code of ['US', 'GB', 'CA', 'AU', 'IE', 'DE', 'FR', 'IN', 'NL', 'ES', 'IT']) {
      if (displayNames.of(code) === value) return true;
    }
  } catch {
    return false;
  }

  return false;
}

export function sanitizeProfileForSetup(profile: UserProfile): UserProfile {
  const safe = normalizeUserProfile(profile);
  if (looksLikeLocaleOnlyLocation(safe.location)) {
    return { ...safe, location: '' };
  }
  return safe;
}

export function profileSetupComplete(profile: UserProfile): boolean {
  const safe = sanitizeProfileForSetup(profile);
  return Boolean(safe.fullName.trim() && safe.location.trim() && safe.headline.trim());
}

export function getMissingProfileSetupFields(profile: UserProfile): Array<
  keyof Pick<UserProfile, 'fullName' | 'location' | 'headline' | 'phone'>
> {
  const safe = normalizeUserProfile(profile);
  const missing: Array<keyof Pick<UserProfile, 'fullName' | 'location' | 'headline' | 'phone'>> = [];
  if (!safe.fullName.trim()) missing.push('fullName');
  if (!safe.location.trim()) missing.push('location');
  if (!safe.headline.trim()) missing.push('headline');
  if (!safe.phone.trim()) missing.push('phone');
  return missing;
}

/** True when a linked LinkedIn account still has basics missing from the profile row. */
export function profileNeedsLinkedInImport(profile: UserProfile): boolean {
  const safe = normalizeUserProfile(profile);
  if (!safe.linkedinConnectedAt) return true;
  return (
    !safe.fullName.trim() ||
    !safe.avatarUrl?.trim() ||
    !safe.linkedinUrl.trim() ||
    !safe.headline.trim()
  );
}

export function formatProfileContactBlock(profile: UserProfile): string {
  const safe = normalizeUserProfile(profile);
  const lines: string[] = [];
  if (safe.fullName) lines.push(safe.fullName);
  if (safe.email) lines.push(safe.email);
  if (safe.phone) lines.push(safe.phone);
  if (safe.location) lines.push(safe.location);
  if (safe.linkedinUrl) lines.push(safe.linkedinUrl);
  if (safe.portfolioUrl) lines.push(safe.portfolioUrl);
  return lines.join('\n');
}
