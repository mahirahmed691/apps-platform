'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AuroraBackground } from '@/components/AuroraBackground';
import { StudioOnboarding, createOnboardingDraft } from '@/components/StudioOnboarding';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useCeevieVoice } from '@/hooks/useCeevieVoice';
import { useStudioPreferences } from '@/hooks/useStudioPreferences';
import { writeMicGrantedLocally } from '@/lib/micAccess';
import {
  nextOnboardingStep,
  resumeOnboardingStep,
  validateOnboardingStep,
  type IdentityVoiceTarget,
  type StudioOnboardingStep,
} from '@/lib/studioOnboarding';
import { normalizeUserProfile, type UserProfile } from '@/lib/userProfile';

type StudioOnboardingGateProps = {
  accessToken?: string;
  profile: UserProfile;
  profileLoaded?: boolean;
  profileSaving?: boolean;
  supabase?: SupabaseClient | null;
  siteUrl?: string;
  fromWelcome?: boolean;
  onComplete: () => void;
  onSaveProfileSetup: (profile: UserProfile) => Promise<boolean>;
  onCompleteStudioSetup?: () => Promise<boolean>;
  onLinkedInImported?: () => void;
};

export function StudioOnboardingGate({
  accessToken,
  profile,
  profileLoaded = true,
  profileSaving = false,
  supabase,
  siteUrl = '',
  fromWelcome = false,
  onComplete,
  onSaveProfileSetup,
  onCompleteStudioSetup,
  onLinkedInImported,
}: StudioOnboardingGateProps) {
  const [onboardingStep, setOnboardingStep] = useState<StudioOnboardingStep>(
    fromWelcome ? 'welcome' : resumeOnboardingStep(profile)
  );
  const [onboardingDraft, setOnboardingDraft] = useState<UserProfile | null>(null);
  const [onboardingTranscript, setOnboardingTranscript] = useState('');
  const [micCheckPassed, setMicCheckPassed] = useState(false);
  const [identityVoiceTarget, setIdentityVoiceTarget] = useState<IdentityVoiceTarget>('name');
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const { prefs } = useStudioPreferences();
  const { speak, cancel } = useCeevieVoice(prefs.ceevieVoice);

  useEffect(() => {
    if (!profile || !profileLoaded) return;
    setOnboardingDraft(createOnboardingDraft(profile));
  }, [profile, profileLoaded]);

  useEffect(() => {
    if (!fromWelcome) return;
    setOnboardingStep('welcome');
    setOnboardingTranscript('');
    setMicCheckPassed(false);
    setIdentityVoiceTarget('name');
    setVoiceError(null);
    if (profile) setOnboardingDraft(createOnboardingDraft(profile));
  }, [fromWelcome, profile]);

  const voice = useVoiceInput({
    accessToken,
    onTranscript: (text) => {
      setVoiceError(null);
      const transcript = text.trim();
      if (!transcript) return;
      setOnboardingTranscript(transcript);

      if (onboardingStep === 'mic') {
        setMicCheckPassed(true);
        writeMicGrantedLocally(true);
        void onCompleteStudioSetup?.();
        void voice.warmMic?.();
        setOnboardingStep('identity');
        speak("Great — I can hear you. Let's put your name on the CV.");
        return;
      }

      if (onboardingStep === 'identity') {
        if (identityVoiceTarget === 'name' || !onboardingDraft?.fullName.trim()) {
          setOnboardingDraft((current) => (current ? { ...current, fullName: transcript } : current));
          setIdentityVoiceTarget('role');
          speak('Got it. Now tell me the kind of role you are going for.');
        } else {
          setOnboardingDraft((current) => (current ? { ...current, headline: transcript } : current));
          speak('Perfect. Add your location on the next screen, or tap Continue.');
        }
        return;
      }

      if (onboardingStep === 'location') {
        setOnboardingDraft((current) => (current ? { ...current, location: transcript } : current));
        speak('Got it. Tap Continue when you are ready.');
      }
    },
    onError: (message) => setVoiceError(message),
  });

  const finishOnboarding = useCallback(() => {
    void voice.warmMic?.();
    cancel();
    onComplete();
  }, [cancel, onComplete, voice]);

  function handleStartMicCheck() {
    setVoiceError(null);
    setOnboardingTranscript('');
    speak('Tap the microphone and say: I am ready to build my CV.');
  }

  function handleOnboardingDraftChange(patch: Partial<UserProfile>) {
    setOnboardingDraft((current) => (current ? { ...current, ...patch } : current));
  }

  function handleOnboardingContinue() {
    if (!onboardingDraft) return;
    const validationError = validateOnboardingStep(onboardingStep, onboardingDraft);
    if (validationError) {
      setVoiceError(validationError);
      return;
    }

    if (onboardingStep === 'mic') {
      if (!micCheckPassed) {
        void onCompleteStudioSetup?.();
        void voice.warmMic?.();
      }
      setOnboardingStep('identity');
      return;
    }

    if (onboardingStep === 'extras') {
      setOnboardingStep('launch');
      return;
    }

    const next = nextOnboardingStep(onboardingStep);
    if (next) setOnboardingStep(next);
  }

  async function handleOnboardingFinish() {
    if (!onboardingDraft) return;
    const ok = await onSaveProfileSetup(normalizeUserProfile(onboardingDraft));
    if (!ok) {
      setVoiceError('Could not save your details. Try again.');
      return;
    }
    finishOnboarding();
  }

  async function handleOnboardingSkip() {
    if (onboardingDraft) {
      await onSaveProfileSetup(normalizeUserProfile(onboardingDraft));
    }
    void onCompleteStudioSetup?.();
    finishOnboarding();
  }

  function handleLinkedInImportedDuringOnboarding() {
    onLinkedInImported?.();
    if (profile) {
      setOnboardingDraft(createOnboardingDraft(profile));
    }
  }

  if (!onboardingDraft) {
    return (
      <div className="studio-onboarding-gate">
        <AuroraBackground />
      </div>
    );
  }

  return (
    <div className="studio-onboarding-gate">
      <AuroraBackground />
      <div className="studio-onboarding-gate-inner">
        <StudioOnboarding
          step={onboardingStep}
          draft={onboardingDraft}
          voice={voice}
          voiceError={voiceError}
          voiceTranscript={onboardingTranscript}
          identityVoiceTarget={identityVoiceTarget}
          saving={profileSaving}
          supabase={supabase}
          siteUrl={siteUrl}
          onDraftChange={handleOnboardingDraftChange}
          onStepChange={setOnboardingStep}
          onIdentityVoiceTargetChange={setIdentityVoiceTarget}
          onStartMicCheck={handleStartMicCheck}
          onContinue={handleOnboardingContinue}
          onFinish={() => void handleOnboardingFinish()}
          onSkip={() => void handleOnboardingSkip()}
          onLinkedInImported={handleLinkedInImportedDuringOnboarding}
        />
      </div>
    </div>
  );
}
