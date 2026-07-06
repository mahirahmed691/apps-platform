'use client';

import { useEffect, useState } from 'react';
import {
  ONBOARDING_STEPS,
  validateOnboardingStep,
  type OnboardingStep,
} from '@/lib/studioOnboarding';
import { getProfileFirstName, normalizeUserProfile, type UserProfile } from '@/lib/userProfile';

type AppOnboardingProps = {
  step: OnboardingStep;
  draft: UserProfile;
  saving?: boolean;
  error?: string | null;
  onDraftChange: (patch: Partial<UserProfile>) => void;
  onStepChange: (step: OnboardingStep) => void;
  onContinue: () => void;
  onFinish: () => void;
  onSkip: () => void;
};

const STEP_COPY: Record<OnboardingStep, { title: string; body: string }> = {
  welcome: {
    title: 'Welcome',
    body: 'Confirm a few basics before you start using __APP_NAME__.',
  },
  profile: {
    title: 'Your profile',
    body: 'We use this on every generated result and skip these questions later.',
  },
  launch: {
    title: 'Ready to go',
    body: 'Your profile is saved. Continue into the app.',
  },
};

export function AppOnboarding({
  step,
  draft,
  saving = false,
  error = null,
  onDraftChange,
  onStepChange,
  onContinue,
  onFinish,
  onSkip,
}: AppOnboardingProps) {
  const safe = normalizeUserProfile(draft);
  const firstName = getProfileFirstName(draft);
  const meta = STEP_COPY[step];
  const progress = ((ONBOARDING_STEPS.indexOf(step) + 1) / ONBOARDING_STEPS.length) * 100;

  return (
    <div className="app-onboarding" role="region" aria-label="App onboarding">
      <div className="app-onboarding-progress" aria-hidden="true">
        <div className="app-onboarding-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="app-onboarding-shell">
        <header className="app-onboarding-header">
          <p className="app-onboarding-kicker">__APP_NAME__</p>
          <h1>{meta.title}</h1>
          <p>{meta.body}</p>
        </header>

        {step === 'welcome' ? (
          <div className="app-onboarding-card">
            <p>{firstName ? `Hi ${firstName} — let's set up your account.` : 'A quick setup before your first run.'}</p>
            <button type="button" className="app-onboarding-primary" onClick={() => onStepChange('profile')}>
              Get started
            </button>
          </div>
        ) : null}

        {step === 'profile' ? (
          <form
            className="app-onboarding-card app-onboarding-form"
            onSubmit={(event) => {
              event.preventDefault();
              onContinue();
            }}
          >
            <label>
              Full name
              <input
                value={draft.fullName}
                onChange={(event) => onDraftChange({ fullName: event.target.value })}
                placeholder="Sarah Ahmed"
                autoComplete="name"
                required
              />
            </label>
            <label>
              Headline
              <input
                value={draft.headline}
                onChange={(event) => onDraftChange({ headline: event.target.value })}
                placeholder="Product manager in fintech"
                required
              />
            </label>
            <label>
              Location
              <input
                value={draft.location}
                onChange={(event) => onDraftChange({ location: event.target.value })}
                placeholder="Manchester, UK"
                autoComplete="address-level2"
                required
              />
            </label>
            <label>
              Phone <span className="app-onboarding-optional">optional</span>
              <input
                value={draft.phone}
                onChange={(event) => onDraftChange({ phone: event.target.value })}
                placeholder="07700 900123"
                autoComplete="tel"
              />
            </label>
            <button type="submit" className="app-onboarding-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Continue'}
            </button>
          </form>
        ) : null}

        {step === 'launch' ? (
          <div className="app-onboarding-card">
            <div className="app-onboarding-summary">
              <strong>{safe.fullName}</strong>
              <span>{safe.headline}</span>
              <span>{safe.location}</span>
            </div>
            <button type="button" className="app-onboarding-primary" onClick={onFinish} disabled={saving}>
              {saving ? 'Opening…' : 'Enter __APP_NAME__'}
            </button>
          </div>
        ) : null}

        {error ? (
          <p className="app-onboarding-error" role="alert">
            {error}
          </p>
        ) : null}

        <footer className="app-onboarding-footer">
          <div className="app-onboarding-dots" aria-hidden="true">
            {ONBOARDING_STEPS.map((item) => (
              <span key={item} className={item === step ? 'app-onboarding-dot-active' : ''} />
            ))}
          </div>
          {step !== 'launch' ? (
            <button type="button" className="app-onboarding-skip" onClick={onSkip} disabled={saving}>
              Skip for now
            </button>
          ) : null}
        </footer>
      </div>
    </div>
  );
}

export function createOnboardingDraft(profile: UserProfile): UserProfile {
  return normalizeUserProfile(profile);
}
