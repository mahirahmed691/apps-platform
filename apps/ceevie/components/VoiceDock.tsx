'use client';

import { FormEvent, type RefObject } from 'react';
import { VoiceListeningIndicator } from '@/components/VoiceListeningIndicator';
import type { useVoiceInput } from '@/hooks/useVoiceInput';

type VoiceController = ReturnType<typeof useVoiceInput>;

type VoiceDockProps = {
  voice: VoiceController;
  micLabel: string;
  voiceError: string | null;
  composerHint?: string;
  composerPlaceholder: string;
  thinking: boolean;
  showTyping: boolean;
  input: string;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  promptPulse: boolean;
  onToggleTyping: () => void;
  onInputChange: (value: string) => void;
  onSkip: () => void;
  onSubmit: (event: FormEvent) => void;
};

export function VoiceDock({
  voice,
  micLabel,
  voiceError,
  composerHint,
  composerPlaceholder,
  thinking,
  showTyping,
  input,
  inputRef,
  promptPulse,
  onToggleTyping,
  onInputChange,
  onSkip,
  onSubmit,
}: VoiceDockProps) {
  const voiceBusy = voice.active || voice.transcribing;
  const showVoiceUi = voice.supported && !showTyping;
  const showTranscript = Boolean(voice.interimText || voice.active);

  return (
    <form className="chat-composer chat-composer-voice voice-dock" onSubmit={onSubmit}>
      {showVoiceUi && (
        <div className="voice-dock-shell">
          {showTranscript && (
            <p className="voice-dock-transcript" aria-live="polite">
              {voice.interimText || 'Listening…'}
            </p>
          )}

          <div className="voice-dock-bar">
            <div className="voice-dock-core">
              <div
                className={`voice-orb ${voice.listening && !voice.transcribing ? 'voice-orb-active' : ''} ${voice.transcribing ? 'voice-orb-busy' : ''} ${promptPulse && !voiceBusy ? 'voice-orb-prompt' : ''}`}
              >
                {voice.listening && !voice.transcribing && (
                  <>
                    <span className="voice-orb-ring" aria-hidden="true" />
                    <span className="voice-orb-ring" aria-hidden="true" />
                  </>
                )}
                <button
                  type="button"
                  className={`voice-mic-btn ${voice.listening ? 'voice-mic-btn-active' : ''} ${voice.state === 'starting' ? 'voice-mic-btn-starting' : ''} ${voice.transcribing ? 'voice-mic-btn-busy' : ''}`}
                  onClick={voice.toggle}
                  disabled={thinking || voice.transcribing}
                  aria-label={micLabel}
                >
                  <span className="voice-mic-icon" aria-hidden="true">
                    {voice.transcribing ? (
                      <span className="spinner spinner-sm spinner-light" />
                    ) : voice.listening ? (
                      <span className="voice-stop-icon" />
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
                  </span>
                </button>
              </div>

              <div className="voice-dock-meta">
                <div className="voice-dock-status">
                  <VoiceListeningIndicator active={voice.listening && !voice.transcribing} />
                  <p className={`voice-mic-label ${voice.listening ? 'voice-mic-label-active' : ''}`}>
                    {micLabel}
                  </p>
                  {!voiceBusy && voice.mode === 'whisper' && (
                    <span className="voice-mode-badge">Studio</span>
                  )}
                </div>
                {!voiceBusy && composerHint && !showTranscript && (
                  <p className="voice-dock-hint">{composerHint}</p>
                )}
              </div>
            </div>

            {!voiceBusy && (
              <div className="voice-dock-actions">
                <button type="button" className="voice-dock-link" onClick={onToggleTyping}>
                  Type
                </button>
                <button type="button" className="voice-dock-link" onClick={onSkip} disabled={thinking}>
                  Skip
                </button>
              </div>
            )}
          </div>

          {!voiceBusy && voice.configLoaded && !voice.whisperAvailable && process.env.NODE_ENV === 'development' && (
            <p className="voice-setup-hint">
              Voice requires <code>OPENAI_API_KEY</code>. Add it to your root <code>.env</code>, run{' '}
              <code>npm run fill-env -- ceevie</code>, restart the dev server, then tap the mic.
            </p>
          )}
        </div>
      )}

      {voiceError && (
        <p className="chat-voice-error" role="alert">
          {voiceError}
        </p>
      )}

      {!voiceBusy && showTyping && (
        <div className="chat-type-fallback">
          {composerHint && <p className="chat-hint">{composerHint}</p>}
          <textarea
            ref={inputRef}
            rows={2}
            className="chat-input"
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            placeholder={composerPlaceholder}
            disabled={thinking}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                onSubmit(event);
              }
            }}
          />
          <div className="chat-composer-actions">
            <button type="button" className="btn btn-ghost" onClick={onToggleTyping}>
              Back to voice
            </button>
            <button type="button" className="btn btn-ghost" onClick={onSkip} disabled={thinking}>
              Skip
            </button>
            <button type="submit" className="btn btn-primary" disabled={thinking || !input.trim()}>
              Send
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
