'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppOnboarding, createOnboardingDraft } from '@/components/AppOnboarding';
import {
  resumeOnboardingStep,
  validateOnboardingStep,
  type OnboardingStep,
} from '@/lib/studioOnboarding';
import { normalizeUserProfile, type UserProfile } from '@/lib/userProfile';

type AppOnboardingGateProps = {
  profile: UserProfile;
  profileLoaded?: boolean;
  profileSaving?: boolean;
  fromWelcome?: boolean;
  onComplete: () => void;
  onSaveProfile: (profile: UserProfile) => Promise<boolean>;
  onCompleteSetup?: () => Promise<boolean>;
};

export function AppOnboardingGate({
  profile,
  profileLoaded = true,
  profileSaving = false,
  fromWelcome = false,
  onComplete,
  onSaveProfile,
  onCompleteSetup,
}: AppOnboardingGateProps) {
  const [step, setStep] = useState<OnboardingStep>(fromWelcome ? 'welcome' : resumeOnboardingStep(profile));
  const [draft, setDraft] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profileLoaded) return;
    setDraft(createOnboardingDraft(profile));
  }, [profile, profileLoaded]);

  useEffect(() => {
    if (!fromWelcome) return;
    setStep('welcome');
    setError(null);
    if (profile) setDraft(createOnboardingDraft(profile));
  }, [fromWelcome, profile]);

  const finish = useCallback(() => {
    onComplete();
  }, [onComplete]);

  function handleContinue() {
    if (!draft) return;
    const validationError = validateOnboardingStep(step, draft);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    if (step === 'profile') {
      setStep('launch');
      return;
    }
  }

  async function handleFinish() {
    if (!draft) return;
    const ok = await onSaveProfile(normalizeUserProfile(draft));
    if (!ok) {
      setError('Could not save your profile. Try again.');
      return;
    }
    finish();
  }

  async function handleSkip() {
    if (draft) await onSaveProfile(normalizeUserProfile(draft));
    await onCompleteSetup?.();
    finish();
  }

  if (!draft) {
    return (
      <div className="app-onboarding-gate">
        <p className="app-onboarding-loading">Loading setup…</p>
      </div>
    );
  }

  return (
    <div className="app-onboarding-gate">
      <AppOnboarding
        step={step}
        draft={draft}
        saving={profileSaving}
        error={error}
        onDraftChange={(patch) => setDraft((current) => (current ? { ...current, ...patch } : current))}
        onStepChange={setStep}
        onContinue={handleContinue}
        onFinish={() => void handleFinish()}
        onSkip={() => void handleSkip()}
      />
    </div>
  );
}
