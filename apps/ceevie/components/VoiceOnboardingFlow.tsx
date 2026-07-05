'use client';

import type { useVoiceInput } from '@/hooks/useVoiceInput';

type VoiceController = ReturnType<typeof useVoiceInput>;
type OnboardingStep = 'intro' | 'mic' | 'name' | 'ready';

type VoiceOnboardingFlowProps = {
  step: OnboardingStep;
  voice: VoiceController;
  transcript: string;
  capturedName: string;
  voiceError: string | null;
  onHearIntro: () => void;
  onStartMicCheck: () => void;
  onCaptureName: () => void;
  onStartInterview: () => void;
  onSkip: () => void;
};

const STEP_META: Record<OnboardingStep, { label: string; title: string; body: string }> = {
  intro: {
    label: '01 / Orientation',
    title: 'Meet your interview studio',
    body: 'Ceevie asks one question at a time. You answer by voice. Your CV writes itself on the page beside you.',
  },
  mic: {
    label: '02 / Mic check',
    title: 'Say the calibration line',
    body: 'Tap the mic and say: I am ready to build my CV. This confirms your microphone and transcription are working.',
  },
  name: {
    label: '03 / Your name',
    title: 'Put your name on the page',
    body: 'Tap the mic again and say your name exactly how it should appear on your CV.',
  },
  ready: {
    label: '04 / Launch',
    title: 'You are ready',
    body: 'The studio is calibrated. Start the interview and Ceevie will use your name as the first answer.',
  },
};

export function VoiceOnboardingFlow({
  step,
  voice,
  transcript,
  capturedName,
  voiceError,
  onHearIntro,
  onStartMicCheck,
  onCaptureName,
  onStartInterview,
  onSkip,
}: VoiceOnboardingFlowProps) {
  const meta = STEP_META[step];
  const voiceBusy = voice.active || voice.transcribing;
  const micLabel = voice.transcribing
    ? 'Transcribing'
    : voice.listening
      ? 'Tap to finish'
      : step === 'name'
        ? 'Say my name'
        : 'Test microphone';

  return (
    <div className="voice-onboarding" role="region" aria-label="Voice onboarding">
      <div className="voice-onboarding-stage">
        <div className="voice-onboarding-copy">
          <p className="voice-onboarding-kicker">{meta.label}</p>
          <h3>{meta.title}</h3>
          <p>{meta.body}</p>
        </div>

        <div className="voice-onboarding-device">
          <div className={`voice-onboarding-orb ${voice.listening ? 'voice-onboarding-orb-active' : ''}`}>
            {voice.listening && <span aria-hidden="true" />}
            <button
              type="button"
              className="voice-onboarding-mic"
              onClick={voice.toggle}
              disabled={step === 'intro' || step === 'ready' || voice.transcribing}
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
                  <path
                    d="M19 11a7 7 0 0 1-14 0M12 18v3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </button>
          </div>
          <div className="voice-onboarding-device-meta">
            <p className="voice-onboarding-mic-label">{micLabel}</p>
            {(voice.interimText || transcript) && (
              <p className="voice-onboarding-live" aria-live="polite">
                {voice.interimText || transcript}
              </p>
            )}
          </div>
        </div>
      </div>

      {(transcript || voice.interimText) && step !== 'mic' && step !== 'name' && (
        <div className="voice-onboarding-transcript" aria-live="polite">
          <span>{voice.listening || voice.transcribing ? 'Hearing' : 'Captured'}</span>
          <p>{voice.interimText || transcript}</p>
        </div>
      )}

      {capturedName && (
        <div className="voice-onboarding-name" aria-live="polite">
          <span>Name for your CV</span>
          <strong>{capturedName}</strong>
        </div>
      )}

      {voiceError && (
        <p className="voice-onboarding-error" role="alert">
          {voiceError}
        </p>
      )}

      <div className="voice-onboarding-steps" aria-hidden="true">
        {(['intro', 'mic', 'name', 'ready'] as OnboardingStep[]).map((item) => (
          <span key={item} className={item === step ? 'voice-onboarding-step-active' : ''} />
        ))}
      </div>

      <div className="voice-onboarding-actions">
        {step === 'intro' && (
          <>
            <button type="button" className="btn btn-secondary" onClick={onHearIntro}>
              Hear Ceevie
            </button>
            <button type="button" className="btn btn-primary" onClick={onStartMicCheck}>
              Start voice setup
            </button>
          </>
        )}

        {step === 'mic' && (
          <>
            <button type="button" className="btn btn-secondary" onClick={onHearIntro} disabled={voiceBusy}>
              Repeat intro
            </button>
            <button type="button" className="btn btn-primary" onClick={onCaptureName} disabled={voiceBusy}>
              Next: my name
            </button>
          </>
        )}

        {step === 'name' && (
          <>
            <button type="button" className="btn btn-secondary" onClick={onCaptureName} disabled={voiceBusy}>
              Hear prompt
            </button>
            <button type="button" className="btn btn-primary" onClick={onStartInterview} disabled={voiceBusy}>
              Start interview
            </button>
          </>
        )}

        {step === 'ready' && (
          <button type="button" className="btn btn-primary" onClick={onStartInterview}>
            Start interview
          </button>
        )}

        <button type="button" className="btn btn-ghost" onClick={onSkip} disabled={voiceBusy}>
          Skip setup
        </button>
      </div>
    </div>
  );
}
