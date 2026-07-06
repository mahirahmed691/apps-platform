import { describe, expect, it } from 'vitest';
import {
  EMPTY_USER_PROFILE,
  normalizeUserProfile,
  onboardingComplete,
  profileSetupComplete,
} from '@/lib/userProfile';

describe('normalizeUserProfile', () => {
  it('trims fields on normalize', () => {
    const profile = normalizeUserProfile({
      ...EMPTY_USER_PROFILE,
      fullName: '  Mahir  ',
      headline: ' Product Manager ',
      location: 'London, UK',
    });
    expect(profile.fullName).toBe('Mahir');
    expect(profile.headline).toBe('Product Manager');
  });
});

describe('onboardingComplete', () => {
  it('requires studio flag and profile fields', () => {
    expect(onboardingComplete(EMPTY_USER_PROFILE)).toBe(false);
    expect(
      onboardingComplete({
        ...EMPTY_USER_PROFILE,
        fullName: 'Mahir Ahmed',
        headline: 'PM',
        location: 'London, UK',
        studioSetupCompletedAt: new Date().toISOString(),
      })
    ).toBe(true);
  });

  it('is false when profile fields missing despite studio flag', () => {
    expect(
      onboardingComplete({
        ...EMPTY_USER_PROFILE,
        studioSetupCompletedAt: new Date().toISOString(),
      })
    ).toBe(false);
  });
});

describe('profileSetupComplete', () => {
  it('checks name, headline, and location', () => {
    expect(profileSetupComplete({ ...EMPTY_USER_PROFILE, fullName: 'Mahir' })).toBe(false);
    expect(
      profileSetupComplete({
        ...EMPTY_USER_PROFILE,
        fullName: 'Mahir',
        headline: 'PM',
        location: 'London, UK',
      })
    ).toBe(true);
  });
});
