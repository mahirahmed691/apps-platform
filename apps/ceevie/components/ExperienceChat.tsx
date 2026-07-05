'use client';

import { FormEvent, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { AnswerSuggestions } from '@/components/AnswerSuggestions';
import { VoiceDock } from '@/components/VoiceDock';
import {
  REQUIRED_CV_SECTIONS,
  getStepExamples,
  isUnclearVoiceAnswer,
  mergeSuggestionLists,
  type ChatMessage,
  type CvAnswers,
} from '@/lib/cvBuilder';
import type { SaveStatus } from '@/hooks/useCvDraft';

const ONBOARDING_KEY = 'ceevie-onboarding-dismissed';
const REQUIRED_SECTIONS = REQUIRED_CV_SECTIONS.length;

type ExperienceChatProps = {
  accessToken?: string;
  messages: ChatMessage[];
  answers: CvAnswers;
  finished: boolean;
  thinking: boolean;
  generating: boolean;
  composerHint?: string;
  composerPlaceholder: string;
  suggestions?: string[];
  saveStatus: SaveStatus;
  onSend: (text: string) => void;
  onSkip: () => void;
  onGenerate: () => void;
  canGenerate: boolean;
  filledSections: number;
  showPreviewFab?: boolean;
  onViewPreview?: () => void;
};

export function ExperienceChat({
  accessToken,
  messages,
  answers,
  finished,
  thinking,
  generating,
  composerHint,
  composerPlaceholder,
  suggestions = [],
  saveStatus,
  onSend,
  onSkip,
  onGenerate,
  canGenerate,
  filledSections,
  showPreviewFab,
  onViewPreview,
}: ExperienceChatProps) {
  const [input, setInput] = useState('');
  const [showTyping, setShowTyping] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [clarityReview, setClarityReview] = useState<{ transcript: string } | null>(null);
  const [promptPulse, setPromptPulse] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const stepExamples = useMemo(() => getStepExamples(answers), [answers]);

  const displaySuggestions = useMemo(
    () => mergeSuggestionLists(suggestions, stepExamples),
    [suggestions, stepExamples]
  );

  const currentPrompt = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === 'assistant') return messages[i].content;
    }
    return undefined;
  }, [messages]);

  const threadMessages = useMemo(() => {
    if (!currentPrompt || finished || thinking) return messages;
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === 'assistant') {
        if (messages[i].content === currentPrompt) {
          return messages.filter((_, index) => index !== i);
        }
        break;
      }
    }
    return messages;
  }, [messages, currentPrompt, finished, thinking]);

  const isEarlyThread = threadMessages.length <= 1 && !thinking && !finished && !clarityReview;

  const suggestionMode = clarityReview ? 'clarity' : suggestions.length > 0 ? 'enhance' : 'examples';

  const showSuggestions =
    !finished &&
    !generating &&
    !thinking &&
    displaySuggestions.length > 0 &&
    (clarityReview || suggestions.length > 0 || isEarlyThread);

  const voice = useVoiceInput({
    accessToken,
    onTranscript: (text) => {
      setVoiceError(null);
      if (isUnclearVoiceAnswer(text)) {
        setClarityReview({ transcript: text.trim() });
        return;
      }
      setClarityReview(null);
      onSend(text);
    },
    onError: (message) => setVoiceError(message),
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setShowOnboarding(!window.localStorage.getItem(ONBOARDING_KEY));
  }, []);

  useEffect(() => {
    if (!voice.supported && voice.configLoaded) setShowTyping(true);
  }, [voice.supported, voice.configLoaded]);

  useEffect(() => {
    if (voice.whisperAvailable && showTyping) setShowTyping(false);
  }, [voice.whisperAvailable]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking, voice.interimText]);

  useEffect(() => {
    const last = messages.at(-1);
    if (last?.role === 'assistant' && !thinking && !finished) {
      setPromptPulse(true);
      const timer = window.setTimeout(() => setPromptPulse(false), 2400);
      return () => window.clearTimeout(timer);
    }
    setPromptPulse(false);
    return undefined;
  }, [messages, thinking, finished]);

  function dismissOnboarding() {
    window.localStorage.setItem(ONBOARDING_KEY, '1');
    setShowOnboarding(false);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (thinking || generating || finished || voice.active || voice.transcribing) return;
    const value = input.trim();
    if (!value) return;
    if (isUnclearVoiceAnswer(value)) {
      setClarityReview({ transcript: value });
      setInput('');
      setShowTyping(false);
      return;
    }
    onSend(value);
    setInput('');
    setShowTyping(false);
    setClarityReview(null);
  }

  function handleSuggestionSelect(text: string) {
    if (thinking || generating || finished || voice.active || voice.transcribing) return;
    setClarityReview(null);
    setShowTyping(false);
    onSend(text);
  }

  function handleSendAnyway() {
    if (!clarityReview || thinking || generating || finished) return;
    const transcript = clarityReview.transcript;
    setClarityReview(null);
    onSend(transcript);
  }

  function handleDismissClarity() {
    setClarityReview(null);
  }

  const progressPercent = Math.min((filledSections / REQUIRED_SECTIONS) * 100, 100);
  const micLabel =
    voice.state === 'starting'
      ? 'Starting mic…'
      : voice.state === 'recording'
        ? 'Tap to finish'
        : voice.state === 'listening'
          ? "Tap when you're done"
          : voice.transcribing
            ? 'Processing…'
            : 'Tap to speak';

  return (
    <section className="chat-panel">
      <div className="chat-panel-header">
        <div className="chat-studio-intro">
          <p className="panel-title">Voice interview</p>
          <h2 className="panel-heading">Speak naturally</h2>
        </div>
        <div className="chat-header-meta">
          {saveStatus === 'saving' && <span className="save-indicator">Saving…</span>}
          {saveStatus === 'saved' && <span className="save-indicator save-indicator-ok">Saved</span>}
          {saveStatus === 'error' && <span className="save-indicator save-indicator-error">Save failed</span>}
          <div className="chat-progress chat-progress-mobile" aria-label={`${filledSections} of ${REQUIRED_SECTIONS} sections captured`}>
            <span className="chat-progress-label">
              {finished ? 'Ready to build' : `${filledSections}/${REQUIRED_SECTIONS} sections`}
            </span>
            <div className="chat-progress-track">
              <div className="chat-progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>
      </div>

      {showOnboarding && (
        <div className="onboarding-banner">
          <div>
            <strong>Voice first — just talk</strong>
            <p>
              Tap the mic, answer out loud, then tap again when you&apos;re done. Ceevie transcribes and asks the
              next question. Type only if you need to.
            </p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={dismissOnboarding}>
            Got it
          </button>
        </div>
      )}

      {!finished && !generating && currentPrompt && (
        <div className="chat-current-question" aria-live="polite">
          <div className="chat-current-question-head">
            <span className="chat-current-question-label">Current question</span>
            {thinking && <span className="chat-current-question-status">Thinking…</span>}
          </div>
          <p className="chat-current-question-text">{currentPrompt}</p>
        </div>
      )}

      {showSuggestions && (
        <AnswerSuggestions
          suggestions={displaySuggestions}
          mode={suggestionMode}
          unclearTranscript={clarityReview?.transcript}
          disabled={thinking || voice.active || voice.transcribing}
          onSelect={handleSuggestionSelect}
          onSendAnyway={clarityReview ? handleSendAnyway : undefined}
          onDismiss={clarityReview ? handleDismissClarity : undefined}
        />
      )}

      <div className={`chat-thread ${isEarlyThread ? 'chat-thread-early' : ''}`} ref={scrollRef} role="log" aria-live="polite">
        {isEarlyThread && (
          <div className="chat-welcome">
            <div className="chat-welcome-icon" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
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
            </div>
            <p className="chat-welcome-kicker">Voice-first CV builder</p>
            <p className="chat-welcome-text">
              Tap the mic below and answer out loud. Ceevie transcribes each reply and asks the next question.
            </p>
          </div>
        )}

        {!isEarlyThread &&
          threadMessages.map((message) => (
            <div
              key={message.id}
              className={`chat-message chat-message-${message.role}`}
            >
              <span className={`chat-avatar chat-avatar-${message.role}`} aria-hidden="true">
                {message.role === 'assistant' ? 'C' : 'Y'}
              </span>
              <div className={`chat-bubble chat-bubble-${message.role}`}>
                <span className="chat-bubble-label">
                  {message.role === 'assistant' ? 'Ceevie' : 'You'}
                </span>
                <p>{message.content}</p>
              </div>
            </div>
          ))}

        {thinking && (
          <div className="chat-message chat-message-assistant" aria-live="polite">
            <span className="chat-avatar chat-avatar-assistant" aria-hidden="true">
              C
            </span>
            <div className="chat-bubble chat-bubble-assistant chat-typing">
              <span className="chat-bubble-label">Ceevie</span>
              <div className="typing-dots">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        )}

        {finished && !generating && (
          <div className="chat-complete">
            <p>
              {canGenerate
                ? 'Ready to turn this into your CV?'
                : 'Almost there — fill in the remaining sections in the preview or keep chatting.'}
            </p>
            <button type="button" className="btn btn-primary" onClick={onGenerate} disabled={!canGenerate}>
              Build my CV
            </button>
          </div>
        )}
      </div>

      {!finished && !generating && (
        <VoiceDock
          voice={voice}
          micLabel={micLabel}
          voiceError={voiceError}
          composerHint={composerHint}
          composerPlaceholder={composerPlaceholder}
          thinking={thinking}
          showTyping={showTyping}
          input={input}
          inputRef={inputRef}
          promptPulse={promptPulse}
          onToggleTyping={() => setShowTyping((prev) => !prev)}
          onInputChange={setInput}
          onSkip={onSkip}
          onSubmit={handleSubmit}
        />
      )}

      {generating && (
        <div className="chat-composer chat-composer-disabled voice-dock">
          <p className="chat-hint">Writing your CV from everything you shared…</p>
        </div>
      )}

      {showPreviewFab && onViewPreview && (
        <button type="button" className="mobile-preview-fab" onClick={onViewPreview}>
          View preview · {filledSections}/{REQUIRED_SECTIONS}
        </button>
      )}
    </section>
  );
}
