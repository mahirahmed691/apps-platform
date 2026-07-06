import { normalizeUserProfile, profileSetupComplete, studioSetupComplete, type UserProfile } from '@/lib/userProfile';

export type OnboardingStep = 'welcome' | 'profile' | 'launch';

export const ONBOARDING_STEPS: OnboardingStep[] = ['welcome', 'profile', 'launch'];

export function resumeOnboardingStep(profile: UserProfile): OnboardingStep {
  const safe = normalizeUserProfile(profile);
  if (!studioSetupComplete(safe)) return 'welcome';
  if (!profileSetupComplete(safe)) return 'profile';
  return 'launch';
}

export function validateOnboardingStep(step: OnboardingStep, profile: UserProfile): string | null {
  if (step !== 'profile') return null;
  const safe = normalizeUserProfile(profile);
  if (!safe.fullName.trim()) return 'Add your name.';
  if (!safe.headline.trim()) return 'Add a short headline for your profile.';
  if (!safe.location.trim()) return 'Add your city and country.';
  return null;
}
