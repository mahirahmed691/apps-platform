export type UserProfile = {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  headline: string;
  studioSetupCompletedAt?: string | null;
};

export const EMPTY_USER_PROFILE: UserProfile = {
  fullName: '',
  email: '',
  phone: '',
  location: '',
  headline: '',
};

export function normalizeUserProfile(profile?: Partial<UserProfile> | null): UserProfile {
  return {
    fullName: profile?.fullName?.trim() ?? '',
    email: profile?.email?.trim() ?? '',
    phone: profile?.phone?.trim() ?? '',
    location: profile?.location?.trim() ?? '',
    headline: profile?.headline?.trim() ?? '',
    studioSetupCompletedAt: profile?.studioSetupCompletedAt ?? null,
  };
}

export function profileSetupComplete(profile: UserProfile): boolean {
  const safe = normalizeUserProfile(profile);
  return Boolean(safe.fullName.trim() && safe.location.trim() && safe.headline.trim());
}

export function studioSetupComplete(profile: UserProfile): boolean {
  return Boolean(profile.studioSetupCompletedAt);
}

export function onboardingComplete(profile: UserProfile): boolean {
  return studioSetupComplete(profile) && profileSetupComplete(profile);
}

export function getProfileFirstName(profile: UserProfile): string {
  return normalizeUserProfile(profile).fullName.split(/\s+/)[0] ?? '';
}
