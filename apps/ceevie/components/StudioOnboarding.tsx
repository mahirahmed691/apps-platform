'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ConnectLinkedInButton } from '@/components/LinkedInSignInButton';
import { UserAvatar } from '@/components/UserAvatar';
import type { useVoiceInput } from '@/hooks/useVoiceInput';
import {
  STUDIO_ONBOARDING_STEPS,
  type IdentityVoiceTarget,
  type StudioOnboardingStep,
} from '@/lib/studioOnboarding';
import {
  getProfileFirstName,
  hasLinkedInImport,
  listLinkedInImportedFields,
  normalizeUserProfile,
  profileNeedsLinkedInImport,
  sanitizeProfileForSetup,
  type UserProfile,
} from '@/lib/userProfile';

type VoiceController = ReturnType<typeof useVoiceInput>;

type StudioOnboardingProps = {
  step: StudioOnboardingStep;
  draft: UserProfile;
  voice: VoiceController;
  voiceError: string | null;
  voiceTranscript: string;
  identityVoiceTarget: IdentityVoiceTarget;
  saving?: boolean;
  supabase?: SupabaseClient | null;
  siteUrl?: string;
  onDraftChange: (patch: Partial<UserProfile>) => void;
  onStepChange: (step: StudioOnboardingStep) => void;
  onIdentityVoiceTargetChange: (target: IdentityVoiceTarget) => void;
  onStartMicCheck: () => void;
  onContinue: () => void;
  onFinish: () => void;
  onSkip: () => void;
  onLinkedInImported?: () => void;
};

const STEP_COPY: Record<StudioOnboardingStep, { kicker: string; title: string; body: string }> = {
  welcome: {
    kicker: 'Ceevie studio',
    title: 'Speak. We write.',
    body: 'Answer a few short questions by voice. Your CV builds live on the page beside you.',
  },
  mic: {
    kicker: 'Step 1 · Voice',
    title: 'Quick mic check',
    body: 'Tap the mic and say: I am ready to build my CV.',
  },
  identity: {
    kicker: 'Step 2 · You',
    title: 'Who is this CV for?',
    body: 'Your name and target role shape every question that follows.',
  },
  location: {
    kicker: 'Step 3 · Location',
    title: 'Where are you based?',
    body: 'City and country is enough — we put it on your CV header.',
  },
  extras: {
    kicker: 'Almost there',
    title: 'Optional extras',
    body: 'Add a phone number or connect LinkedIn. You can skip and fill these later.',
  },
  launch: {
    kicker: 'Ready',
    title: "Let's build your story",
    body: 'We will ask about your experience, wins, and skills — all by voice.',
  },
};

function OnboardingMicIcon() {
  return (
    <svg className="studio-onboarding-mic-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="4" width="6" height="10" rx="3" fill="currentColor" />
      <path
        d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17.5V20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

type OnboardingVoiceFieldProps = {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  autoComplete?: string;
  hero?: boolean;
  hint?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  voiceActive: boolean;
  voiceBusy: boolean;
  voiceLabel: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  onVoice: () => void;
};

function OnboardingVoiceField({
  id,
  label,
  value,
  placeholder,
  autoComplete,
  hero = false,
  hint,
  inputRef,
  voiceActive,
  voiceBusy,
  voiceLabel,
  onChange,
  onFocus,
  onVoice,
}: OnboardingVoiceFieldProps) {
  return (
    <div className="studio-onboarding-field">
      <label className="studio-onboarding-field-label" htmlFor={id}>
        {label}
      </label>
      <input
        ref={inputRef}
        id={id}
        className={`studio-onboarding-field-input${hero ? ' studio-onboarding-field-input-hero' : ''}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocus}
        placeholder={placeholder}
        autoComplete={autoComplete}
        spellCheck={false}
      />
      {hint ? <p className="studio-onboarding-field-hint">{hint}</p> : null}
      <button
        type="button"
        className={`studio-onboarding-voice-action${voiceActive ? ' studio-onboarding-voice-action-active' : ''}`}
        onClick={onVoice}
        disabled={voiceBusy}
        aria-label={voiceLabel}
      >
        <OnboardingMicIcon />
        <span>Say with voice</span>
      </button>
    </div>
  );
}

function stepProgress(step: StudioOnboardingStep): number {
  const index = STUDIO_ONBOARDING_STEPS.indexOf(step);
  if (index <= 0) return 0;
  return Math.round((index / (STUDIO_ONBOARDING_STEPS.length - 1)) * 100);
}

export function StudioOnboarding({
  step,
  draft,
  voice,
  voiceError,
  voiceTranscript,
  identityVoiceTarget,
  saving = false,
  supabase,
  siteUrl = '',
  onDraftChange,
  onStepChange,
  onIdentityVoiceTargetChange,
  onStartMicCheck,
  onContinue,
  onFinish,
  onSkip,
  onLinkedInImported,
}: StudioOnboardingProps) {
  const safe = sanitizeProfileForSetup(draft);
  const firstName = getProfileFirstName(safe);
  const nameRef = useRef<HTMLInputElement>(null);
  const roleRef = useRef<HTMLInputElement>(null);
  const locationRef = useRef<HTMLInputElement>(null);
  const [namePulse, setNamePulse] = useState(false);

  const linkedInConnected = hasLinkedInImport(safe);
  const linkedInNeedsRefresh = linkedInConnected && profileNeedsLinkedInImport(safe);
  const importedFields = listLinkedInImportedFields(draft);
  const voiceBusy = voice.active || voice.transcribing;
  const meta = STEP_COPY[step];
  const progress = stepProgress(step);

  useEffect(() => {
    if (step !== 'identity') return;
    const timer = window.setTimeout(() => {
      if (!safe.fullName.trim()) nameRef.current?.focus();
      else roleRef.current?.focus();
    }, 120);
    return () => window.clearTimeout(timer);
  }, [step, safe.fullName]);

  useEffect(() => {
    if (step !== 'location') return;
    const timer = window.setTimeout(() => locationRef.current?.focus(), 120);
    return () => window.clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    if (step === 'identity' && safe.fullName.trim()) {
      setNamePulse(true);
      const timer = window.setTimeout(() => setNamePulse(false), 900);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [safe.fullName, step]);

  const micLabel = voice.transcribing
    ? 'Transcribing…'
    : voice.listening
      ? 'Tap to finish'
      : step === 'mic'
        ? 'Test mic'
        : step === 'location'
          ? 'Say your location'
          : identityVoiceTarget === 'role'
            ? 'Say your role'
            : 'Say your name';

  return (
    <div className="studio-onboarding" role="region" aria-label="Studio onboarding">
      <div className="studio-onboarding-progress" aria-hidden="true">
        <div className="studio-onboarding-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="studio-onboarding-shell">
        <header className="studio-onboarding-header">
          <p className="studio-onboarding-kicker">{meta.kicker}</p>
          <h2 className="studio-onboarding-title">{meta.title}</h2>
          <p className="studio-onboarding-body">{meta.body}</p>
        </header>

        {step === 'welcome' && (
          <div className="studio-onboarding-welcome-card">
            <div className="studio-onboarding-welcome-steps" aria-hidden="true">
              <span>Mic</span>
              <span aria-hidden="true">→</span>
              <span>You</span>
              <span aria-hidden="true">→</span>
              <span>Interview</span>
            </div>
            <button type="button" className="btn btn-primary studio-onboarding-primary" onClick={() => onStepChange('mic')}>
              Get started
            </button>
          </div>
        )}

        {step === 'mic' && (
          <div className="studio-onboarding-mic-stage">
            <div className={`studio-onboarding-orb${voice.listening ? ' studio-onboarding-orb-active' : ''}`}>
              <button
                type="button"
                className="studio-onboarding-mic-btn"
                onClick={voice.toggle}
                disabled={voice.transcribing}
                aria-label={micLabel}
              >
                {voice.transcribing ? (
                  <span className="spinner spinner-sm spinner-light" aria-hidden="true" />
                ) : voice.listening ? (
                  <span className="voice-stop-icon" aria-hidden="true" />
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path d="M19 11a7 7 0 0 1-14 0M12 18v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                )}
              </button>
            </div>
            <div className="studio-onboarding-mic-meta">
              <p className="studio-onboarding-mic-label">{micLabel}</p>
              {(voice.interimText || voiceTranscript) && (
                <p className="studio-onboarding-live" aria-live="polite">
                  {voice.interimText || voiceTranscript}
                </p>
              )}
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onStartMicCheck} disabled={voiceBusy}>
              Hear prompt
            </button>
            <button type="button" className="btn btn-primary studio-onboarding-primary" onClick={onContinue} disabled={voiceBusy}>
              Continue
            </button>
          </div>
        )}

        {step === 'identity' && (
          <div className="studio-onboarding-identity">
            {importedFields.length > 0 ? (
              <p className="studio-onboarding-imported">From LinkedIn: {importedFields.join(' · ')}</p>
            ) : null}

            <div className={namePulse ? 'studio-onboarding-field-pulse' : undefined}>
              <OnboardingVoiceField
                id="studio-onboarding-name"
                label="Your name"
                value={draft.fullName}
                placeholder="Sarah Ahmed"
                autoComplete="name"
                hero
                hint={firstName ? `CV header: ${safe.fullName.trim() || '…'}` : undefined}
                inputRef={nameRef}
                voiceActive={identityVoiceTarget === 'name' && voice.listening}
                voiceBusy={voiceBusy}
                voiceLabel="Say your name"
                onChange={(value) => onDraftChange({ fullName: value })}
                onFocus={() => onIdentityVoiceTargetChange('name')}
                onVoice={() => {
                  onIdentityVoiceTargetChange('name');
                  voice.toggle();
                }}
              />
            </div>

            <OnboardingVoiceField
              id="studio-onboarding-role"
              label="Target role"
              value={draft.headline}
              placeholder="Senior Product Manager in fintech"
              autoComplete="organization-title"
              inputRef={roleRef}
              voiceActive={identityVoiceTarget === 'role' && voice.listening}
              voiceBusy={voiceBusy}
              voiceLabel="Say your target role"
              onChange={(value) => onDraftChange({ headline: value })}
              onFocus={() => onIdentityVoiceTargetChange('role')}
              onVoice={() => {
                onIdentityVoiceTargetChange('role');
                voice.toggle();
              }}
            />

            <button type="button" className="btn btn-primary studio-onboarding-primary" onClick={onContinue} disabled={saving || voiceBusy}>
              {saving ? 'Saving…' : 'Continue'}
            </button>
          </div>
        )}

        {step === 'location' && (
          <div className="studio-onboarding-location">
            <OnboardingVoiceField
              id="studio-onboarding-location"
              label="City & country"
              value={draft.location}
              placeholder="Manchester, UK"
              autoComplete="address-level2"
              inputRef={locationRef}
              voiceActive={identityVoiceTarget === 'location' && voice.listening}
              voiceBusy={voiceBusy}
              voiceLabel="Say your location"
              onChange={(value) => onDraftChange({ location: value })}
              onFocus={() => onIdentityVoiceTargetChange('location')}
              onVoice={() => {
                onIdentityVoiceTargetChange('location');
                voice.toggle();
              }}
            />
            <p className="studio-onboarding-email-note">
              Email <span>{safe.email || 'from your sign-in'}</span> — already on your account.
            </p>
            <button type="button" className="btn btn-primary studio-onboarding-primary" onClick={onContinue} disabled={saving || voiceBusy}>
              {saving ? 'Saving…' : 'Continue'}
            </button>
          </div>
        )}

        {step === 'extras' && (
          <div className="studio-onboarding-extras">
            <div className="studio-onboarding-extras-profile">
              <UserAvatar name={safe.fullName} email={safe.email} avatarUrl={safe.avatarUrl} size="md" />
              <div>
                <p className="studio-onboarding-extras-name">{safe.fullName}</p>
                <p className="studio-onboarding-extras-role">{safe.headline}</p>
                <p className="studio-onboarding-extras-location">{safe.location}</p>
              </div>
            </div>

            <label className="studio-onboarding-field-label" htmlFor="studio-onboarding-phone">
              Phone <span className="studio-onboarding-optional">optional</span>
            </label>
            <input
              id="studio-onboarding-phone"
              className="studio-onboarding-field-input"
              value={draft.phone}
              onChange={(event) => onDraftChange({ phone: event.target.value })}
              placeholder="07700 900123"
              autoComplete="tel"
            />

            {supabase && siteUrl && (!linkedInConnected || linkedInNeedsRefresh) ? (
              <div className="studio-onboarding-linkedin">
                <ConnectLinkedInButton
                  supabase={supabase}
                  siteUrl={siteUrl}
                  linked={linkedInConnected}
                  synced={linkedInConnected}
                  onConnected={onLinkedInImported}
                />
              </div>
            ) : null}

            <div className="studio-onboarding-extras-actions">
              <button type="button" className="btn btn-primary studio-onboarding-primary" onClick={onContinue} disabled={saving}>
                {saving ? 'Saving…' : 'Continue'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={onContinue} disabled={saving}>
                Skip extras
              </button>
            </div>
          </div>
        )}

        {step === 'launch' && (
          <div className="studio-onboarding-launch">
            <div className="studio-onboarding-launch-card">
              <UserAvatar name={safe.fullName} email={safe.email} avatarUrl={safe.avatarUrl} size="md" />
              <div>
                <p className="studio-onboarding-launch-name">{safe.fullName}</p>
                <p className="studio-onboarding-launch-role">{safe.headline}</p>
                <p className="studio-onboarding-launch-meta">
                  {safe.location}
                  {safe.phone ? ` · ${safe.phone}` : ''}
                </p>
              </div>
            </div>
            <button type="button" className="btn btn-primary studio-onboarding-primary studio-onboarding-launch-btn" onClick={onFinish} disabled={saving}>
              {saving ? 'Opening studio…' : 'Start interview'}
            </button>
          </div>
        )}

        {voiceError ? (
          <p className="studio-onboarding-error" role="alert">
            {voiceError}
          </p>
        ) : null}

        <div className="studio-onboarding-footer">
          <div className="studio-onboarding-dots" aria-hidden="true">
            {STUDIO_ONBOARDING_STEPS.map((item) => (
              <span key={item} className={item === step ? 'studio-onboarding-dot-active' : ''} />
            ))}
          </div>
          {step !== 'launch' && step !== 'welcome' ? (
            <button type="button" className="btn btn-ghost btn-sm studio-onboarding-skip" onClick={onSkip} disabled={saving || voiceBusy}>
              Skip setup
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function createOnboardingDraft(profile: UserProfile): UserProfile {
  return sanitizeProfileForSetup(normalizeUserProfile(profile));
}
