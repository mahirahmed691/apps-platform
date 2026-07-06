'use client';

import { FormEvent, type RefObject } from 'react';
import { MobileTypeSheet } from '@/components/MobileTypeSheet';
import { VoiceListeningIndicator } from '@/components/VoiceListeningIndicator';
import type { useVoiceInput } from '@/hooks/useVoiceInput';

type VoiceController = ReturnType<typeof useVoiceInput>;

type SuggestionMode = 'clarity' | 'examples' | 'enhance';

type MobileVoiceDockProps = {
  voice: VoiceController;
  micLabel: string;
  voiceError: string | null;
  composerPlaceholder: string;
  thinking: boolean;
  showTyping: boolean;
  input: string;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  promptPulse: boolean;
  previewLabel: string;
  showPreviewBadge: boolean;
  previewSectionCount?: number;
  previewSectionTotal?: number;
  currentPrompt?: string;
  suggestions?: string[];
  suggestionMode?: SuggestionMode;
  unclearTranscript?: string;
  onPreview: () => void;
  onToggleTyping: () => void;
  onInputChange: (value: string) => void;
  onSkip: () => void;
  onSubmit: (event: FormEvent) => void;
  onSendAnyway?: () => void;
  onDismissClarity?: () => void;
};

function DocIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 4h7l3 3v13H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M15 4v4h4M10 13h6M10 17h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M19 11a7 7 0 0 1-14 0M12 18v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function MobileVoiceDock({
  voice,
  micLabel,
  voiceError,
  composerPlaceholder,
  thinking,
  showTyping,
  input,
  inputRef,
  promptPulse,
  previewLabel,
  showPreviewBadge,
  previewSectionCount = 0,
  previewSectionTotal = 6,
  currentPrompt,
  suggestions = [],
  suggestionMode = 'examples',
  unclearTranscript,
  onPreview,
  onToggleTyping,
  onInputChange,
  onSkip,
  onSubmit,
  onSendAnyway,
  onDismissClarity,
}: MobileVoiceDockProps) {
  const voiceBusy = voice.active || voice.transcribing;
  const isListening = voice.listening && !voice.transcribing;

  return (
    <>
      <MobileTypeSheet
        open={showTyping}
        currentPrompt={currentPrompt}
        suggestions={suggestions}
        suggestionMode={suggestionMode}
        unclearTranscript={unclearTranscript}
        input={input}
        composerPlaceholder={composerPlaceholder}
        thinking={thinking}
        inputRef={inputRef}
        onInputChange={onInputChange}
        onSubmit={onSubmit}
        onClose={onToggleTyping}
        onSendAnyway={onSendAnyway}
        onDismissClarity={onDismissClarity}
      />

      <form className="mobile-voice-dock" onSubmit={onSubmit}>
        {isListening && voice.interimText ? (
          <p className="mobile-voice-dock-transcript" aria-live="polite">
            {voice.interimText}
          </p>
        ) : null}

        {voiceError ? (
          <p className="chat-voice-error mobile-voice-dock-error" role="alert">
            {voiceError}
          </p>
        ) : null}

        <div className="mobile-voice-dock-rail">
          <button
            type="button"
            className="mobile-voice-dock-preview"
            onClick={onPreview}
            aria-label={`${previewLabel}${previewSectionCount > 0 ? `, ${previewSectionCount} of ${previewSectionTotal} sections captured` : ''}`}
          >
            <span className="mobile-voice-dock-preview-icon">
              <DocIcon />
              {showPreviewBadge ? <span className="mobile-bottom-nav-badge" aria-hidden="true" /> : null}
            </span>
            <span className="mobile-voice-dock-preview-copy">
              <span className="mobile-voice-dock-preview-label">{previewLabel}</span>
              {previewSectionCount > 0 ? (
                <span className="mobile-voice-dock-preview-meta">
                  {previewSectionCount}/{previewSectionTotal}
                </span>
              ) : null}
            </span>
          </button>

          <span className="mobile-voice-dock-rail-divider" aria-hidden="true" />

          {!showTyping && voice.supported ? (
            <>
              <button
                type="button"
                className={`mobile-voice-dock-mic ${isListening ? 'mobile-voice-dock-mic-listening' : ''} ${voice.transcribing ? 'mobile-voice-dock-mic-busy' : ''} ${promptPulse && !voiceBusy ? 'mobile-voice-dock-mic-prompt' : ''}`}
                onClick={voice.toggle}
                disabled={thinking || voice.transcribing}
                aria-label={micLabel}
              >
                <span className="mobile-voice-dock-mic-inner" aria-hidden="true">
                  {voice.transcribing ? (
                    <span className="spinner spinner-sm spinner-light" />
                  ) : isListening ? (
                    <VoiceListeningIndicator active />
                  ) : (
                    <MicIcon />
                  )}
                </span>
              </button>
              <button type="button" className="mobile-voice-dock-aux" onClick={onToggleTyping} disabled={thinking}>
                Type
              </button>
              <button type="button" className="mobile-voice-dock-aux" onClick={onSkip} disabled={thinking}>
                Skip
              </button>
            </>
          ) : (
            <button type="button" className="mobile-voice-dock-aux mobile-voice-dock-aux-wide" onClick={onToggleTyping}>
              Mic
            </button>
          )}
        </div>
      </form>
    </>
  );
}
