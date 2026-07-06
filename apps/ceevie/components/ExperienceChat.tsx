'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useCeevieVoice } from '@/hooks/useCeevieVoice';
import { useStudioPreferences } from '@/hooks/useStudioPreferences';
import { AnswerSuggestions } from '@/components/AnswerSuggestions';
import { VoiceDock } from '@/components/VoiceDock';
import { MobileVoiceDock } from '@/components/MobileVoiceDock';
import { playCompleteChime } from '@/lib/studioSounds';
import {
  REQUIRED_CV_SECTIONS,
  getStepExamples,
  isUnclearVoiceAnswer,
  mergeSuggestionLists,
  type ChatMessage,
  type CvAnswers,
} from '@/lib/cvBuilder';
import { LinkedInImportCard, shouldShowLinkedInImportCard } from '@/components/LinkedInImportCard';
import type { SaveStatus } from '@/hooks/useCvDraft';
import { RoleBriefBanner } from '@/components/RoleBriefBanner';
import { CompanyFollowPanel } from '@/components/CompanyFollowPanel';
import type { CompanyProfile } from '@/lib/companies';
import type { PublicRoleBrief } from '@/lib/roleBrief';
import { profileSetupComplete, type UserProfile } from '@/lib/userProfile';
import { useMicWarmup } from '@/hooks/useMicWarmup';

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
  mobilePanel?: 'chat' | 'preview';
  previewLabel?: string;
  showPreviewBadge?: boolean;
  profile?: UserProfile;
  profileLoaded?: boolean;
  linkedInImportFresh?: boolean;
  roleBrief?: PublicRoleBrief | null;
  onTailorCompanies?: (selected: CompanyProfile[], workedAt?: CompanyProfile[]) => void;
  companiesOpen?: boolean;
  onCompaniesOpenChange?: (open: boolean) => void;
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
  mobilePanel = 'chat',
  previewLabel = 'Preview',
  showPreviewBadge = false,
  profile,
  profileLoaded = true,
  linkedInImportFresh = false,
  roleBrief,
  onTailorCompanies,
  companiesOpen: companiesOpenProp,
  onCompaniesOpenChange,
}: ExperienceChatProps) {
  const [input, setInput] = useState('');
  const [showTyping, setShowTyping] = useState(false);
  const [linkedInImportDismissed, setLinkedInImportDismissed] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [clarityReview, setClarityReview] = useState<{ transcript: string } | null>(null);
  const [promptPulse, setPromptPulse] = useState(false);
  const [compactLayout, setCompactLayout] = useState(false);
  const [internalCompaniesOpen, setInternalCompaniesOpen] = useState(false);
  const companiesOpen = companiesOpenProp ?? internalCompaniesOpen;
  const setCompaniesOpen = onCompaniesOpenChange ?? setInternalCompaniesOpen;
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const prevFinishedRef = useRef(false);

  const { prefs, hydrated } = useStudioPreferences();
  const { speak, cancel } = useCeevieVoice(prefs.ceevieVoice);

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

  const threadMessages = messages;

  const isEarlyThread = threadMessages.length <= 1 && !thinking && !finished && !clarityReview;
  const hasUserMessages = messages.some((message) => message.role === 'user');
  const showLinkedInImport =
    Boolean(profile) &&
    profileSetupComplete(profile!) &&
    shouldShowLinkedInImportCard(profile!, hasUserMessages) &&
    !linkedInImportDismissed;

  useEffect(() => {
    if (linkedInImportFresh) setLinkedInImportDismissed(false);
  }, [linkedInImportFresh]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(max-width: 900px)');
    const sync = () => setCompactLayout(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  const suggestionMode = clarityReview ? 'clarity' : suggestions.length > 0 ? 'enhance' : 'examples';

  const showSuggestions =
    !finished &&
    !generating &&
    !thinking &&
    displaySuggestions.length > 0 &&
    (clarityReview || suggestions.length > 0);

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

  useMicWarmup({
    profile,
    profileLoaded,
    enabled: true,
    voice,
  });

  useEffect(() => {
    if (!voice.whisperAvailable && voice.configLoaded) setShowTyping(true);
  }, [voice.supported, voice.configLoaded, voice.whisperAvailable]);

  useEffect(() => {
    if (voice.whisperAvailable && showTyping) setShowTyping(false);
  }, [voice.whisperAvailable, showTyping]);

  useEffect(() => {
    if (voice.active || voice.transcribing || thinking) {
      cancel();
      return;
    }

    if (!hydrated || !currentPrompt || finished || generating) return;

    const timer = window.setTimeout(() => {
      speak(currentPrompt);
    }, 350);

    return () => {
      window.clearTimeout(timer);
      cancel();
    };
  }, [cancel, currentPrompt, finished, generating, hydrated, speak, thinking, voice.active, voice.transcribing]);

  useEffect(() => {
    if (finished && !prevFinishedRef.current && hydrated && prefs.captureSound) {
      void playCompleteChime();
    }
    prevFinishedRef.current = finished;
  }, [finished, hydrated, prefs.captureSound]);

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

  const micLabel =
    voice.state === 'starting'
      ? 'Starting…'
      : voice.state === 'recording' || voice.state === 'listening'
        ? 'Listening…'
        : voice.transcribing
          ? 'Processing…'
          : 'Tap to speak';

  const embedVoiceInDock = compactLayout && mobilePanel === 'chat';

  const voiceDock = !finished && !generating ? (
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
  ) : null;

  const chatPanel = (
    <section className={`chat-panel chat-panel-clean${compactLayout ? ' chat-panel-compact' : ''}`}>
      {saveStatus !== 'idle' ? (
        <div className="chat-save-strip" aria-live="polite">
          {saveStatus === 'saving' && <span>Saving…</span>}
          {saveStatus === 'saved' && <span>Saved</span>}
          {saveStatus === 'error' && <span className="chat-save-strip-error">Save failed</span>}
        </div>
      ) : null}

      <div className="chat-studio-main">
        {roleBrief ? <RoleBriefBanner brief={roleBrief} /> : null}

        {showLinkedInImport && profile && (
          <LinkedInImportCard
            profile={profile}
            onStart={() => setLinkedInImportDismissed(true)}
            onDismiss={() => setLinkedInImportDismissed(true)}
          />
        )}

        <div className={`chat-thread ${isEarlyThread ? 'chat-thread-early' : ''}`} ref={scrollRef} role="log" aria-live="polite">
          {isEarlyThread && (
            <div className="chat-welcome chat-welcome-minimal">
              <p className="chat-welcome-text">Tap the mic and speak naturally — your CV builds live as you go.</p>
            </div>
          )}

          {threadMessages.map((message, index) => {
            const isCurrentPrompt =
              !finished &&
              !thinking &&
              message.role === 'assistant' &&
              message.content === currentPrompt &&
              index === threadMessages.length - 1;

            return (
              <div
                key={message.id}
                className={`chat-message chat-message-${message.role}${isCurrentPrompt ? ' chat-message-current' : ''}`}
              >
                <span className={`chat-avatar chat-avatar-${message.role}`} aria-hidden="true">
                  {message.role === 'assistant' ? 'C' : 'Y'}
                </span>
                <div className={`chat-bubble chat-bubble-${message.role}`}>
                  <p>{message.content}</p>
                </div>
              </div>
            );
          })}

          {thinking && (
            <div className="chat-message chat-message-assistant" aria-live="polite">
              <span className="chat-avatar chat-avatar-assistant" aria-hidden="true">
                C
              </span>
              <div className="chat-bubble chat-bubble-assistant chat-typing">
                <div className="typing-dots">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          )}

          {finished && !generating && (
            <div className="chat-complete chat-complete-minimal">
              <p>
                {canGenerate
                  ? 'Your story is ready — build your CV when you are.'
                  : 'Almost there — keep talking or fill gaps on the preview.'}
              </p>
              <button type="button" className="btn btn-primary btn-build-cv" onClick={onGenerate} disabled={!canGenerate}>
                Build my CV
              </button>
            </div>
          )}
        </div>

        {showSuggestions && !(compactLayout && showTyping) ? (
          <AnswerSuggestions
            suggestions={displaySuggestions}
            mode={suggestionMode}
            unclearTranscript={clarityReview?.transcript}
            disabled={thinking || voice.active || voice.transcribing}
            compact={!clarityReview}
            onSelect={handleSuggestionSelect}
            onSendAnyway={clarityReview ? handleSendAnyway : undefined}
            onDismiss={clarityReview ? handleDismissClarity : undefined}
          />
        ) : null}

        {!embedVoiceInDock && voiceDock}

        {generating && !embedVoiceInDock && (
          <div className="chat-composer chat-composer-disabled voice-dock">
            <p className="chat-hint">Writing your CV from everything you shared…</p>
          </div>
        )}

        {showPreviewFab && onViewPreview && (
          <button type="button" className="mobile-preview-fab" onClick={onViewPreview}>
            View preview · {filledSections}/{REQUIRED_SECTIONS}
          </button>
        )}

        {onTailorCompanies ? (
          <CompanyFollowPanel
            accessToken={accessToken}
            answers={answers}
            onTailorCompanies={onTailorCompanies}
            presentation="drawer"
            open={companiesOpen}
            onOpenChange={setCompaniesOpen}
            showTrigger={false}
          />
        ) : null}
      </div>
    </section>
  );

  const mobileDock =
    embedVoiceInDock && onViewPreview ? (
      <div className="mobile-studio-dock mobile-studio-dock-chat">
        {generating ? (
          <div className="chat-composer chat-composer-disabled voice-dock voice-dock-embedded">
            <p className="chat-hint">Writing your CV…</p>
          </div>
        ) : (
          <MobileVoiceDock
            voice={voice}
            micLabel={micLabel}
            voiceError={voiceError}
            composerPlaceholder={composerPlaceholder}
            thinking={thinking}
            showTyping={showTyping}
            input={input}
            inputRef={inputRef}
            promptPulse={promptPulse}
            previewLabel={previewLabel}
            showPreviewBadge={showPreviewBadge}
            previewSectionCount={filledSections}
            previewSectionTotal={REQUIRED_SECTIONS}
            currentPrompt={currentPrompt}
            suggestions={showSuggestions ? displaySuggestions : []}
            suggestionMode={suggestionMode}
            unclearTranscript={clarityReview?.transcript}
            onPreview={onViewPreview}
            onToggleTyping={() => {
              if (voice.active) voice.stop();
              setShowTyping((prev) => !prev);
            }}
            onInputChange={setInput}
            onSkip={onSkip}
            onSubmit={handleSubmit}
            onSendAnyway={clarityReview ? handleSendAnyway : undefined}
            onDismissClarity={clarityReview ? handleDismissClarity : undefined}
          />
        )}
      </div>
    ) : null;

  if (compactLayout) {
    if (mobilePanel !== 'chat') {
      return <div className="mobile-studio-stack-collapsed" aria-hidden="true">{chatPanel}</div>;
    }

    return (
      <div className="mobile-studio-stack">
        {chatPanel}
        {mobileDock}
      </div>
    );
  }

  return chatPanel;
}
