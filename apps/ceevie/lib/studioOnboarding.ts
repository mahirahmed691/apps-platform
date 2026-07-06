import { normalizeUserProfile, profileSetupComplete, studioSetupComplete, type UserProfile } from '@/lib/userProfile';

export type StudioOnboardingStep = 'welcome' | 'mic' | 'identity' | 'location' | 'extras' | 'launch';

export const STUDIO_ONBOARDING_STEPS: StudioOnboardingStep[] = [
  'welcome',
  'mic',
  'identity',
  'location',
  'extras',
  'launch',
];

export type IdentityVoiceTarget = 'name' | 'role' | 'location';

export function onboardingProgressIndex(step: StudioOnboardingStep): number {
  return STUDIO_ONBOARDING_STEPS.indexOf(step);
}

export function nextOnboardingStep(step: StudioOnboardingStep): StudioOnboardingStep | null {
  const index = onboardingProgressIndex(step);
  if (index < 0 || index >= STUDIO_ONBOARDING_STEPS.length - 1) return null;
  return STUDIO_ONBOARDING_STEPS[index + 1];
}

export function resumeOnboardingStep(profile: UserProfile): StudioOnboardingStep {
  const safe = normalizeUserProfile(profile);
  if (!studioSetupComplete(safe)) return 'welcome';
  if (!safe.fullName.trim() || !safe.headline.trim()) return 'identity';
  if (!safe.location.trim()) return 'location';
  if (profileSetupComplete(safe)) return 'launch';
  return 'extras';
}

export function validateOnboardingStep(step: StudioOnboardingStep, profile: UserProfile): string | null {
  const safe = normalizeUserProfile(profile);
  if (step === 'identity') {
    if (!safe.fullName.trim()) return 'Add your name as it should appear on your CV.';
    if (!safe.headline.trim()) return 'Add the kind of role you are going for.';
  }
  if (step === 'location' && !safe.location.trim()) {
    return 'Add your city and country — recruiters expect it on a CV.';
  }
  return null;
}

export function canFinishOnboarding(profile: UserProfile): boolean {
  return profileSetupComplete(normalizeUserProfile(profile));
}
