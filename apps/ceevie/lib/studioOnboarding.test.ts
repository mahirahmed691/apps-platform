import { describe, expect, it } from 'vitest';
import { resumeOnboardingStep, validateOnboardingStep } from '@/lib/studioOnboarding';
import { EMPTY_USER_PROFILE } from '@/lib/userProfile';

describe('resumeOnboardingStep', () => {
  it('starts at welcome without studio flag', () => {
    expect(resumeOnboardingStep(EMPTY_USER_PROFILE)).toBe('welcome');
  });

  it('jumps to identity when studio done but name missing', () => {
    expect(
      resumeOnboardingStep({
        ...EMPTY_USER_PROFILE,
        studioSetupCompletedAt: new Date().toISOString(),
      })
    ).toBe('identity');
  });
});

describe('validateOnboardingStep', () => {
  it('requires name and role on identity step', () => {
    expect(validateOnboardingStep('identity', EMPTY_USER_PROFILE)).toMatch(/name/i);
    expect(
      validateOnboardingStep('identity', {
        ...EMPTY_USER_PROFILE,
        fullName: 'Mahir Ahmed',
      })
    ).toMatch(/role/i);
  });

  it('requires location on location step', () => {
    expect(
      validateOnboardingStep('location', {
        ...EMPTY_USER_PROFILE,
        fullName: 'Mahir',
        headline: 'PM',
      })
    ).toMatch(/city|country/i);
  });
});
