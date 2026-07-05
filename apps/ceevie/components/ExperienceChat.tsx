'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useCeevieVoice } from '@/hooks/useCeevieVoice';
import { useStudioPreferences } from '@/hooks/useStudioPreferences';
import { AnswerSuggestions } from '@/components/AnswerSuggestions';
import { VoiceOnboardingFlow } from '@/components/VoiceOnboardingFlow';
import { VoiceDock } from '@/components/VoiceDock';
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
import { ProfileSetupCard } from '@/components/ProfileSetupCard';
import type { SaveStatus } from '@/hooks/useCvDraft';
import { RoleBriefBanner } from '@/components/RoleBriefBanner';
import type { PublicRoleBrief } from '@/lib/roleBrief';
import { profileSetupComplete, type UserProfile } from '@/lib/userProfile';

const ONBOARDING_KEY = 'ceevie-onboarding-dismissed';
const REQUIRED_SECTIONS = REQUIRED_CV_SECTIONS.length;
type OnboardingStep = 'intro' | 'mic' | 'name' | 'ready';

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
  onRegisterOpenOnboarding?: (open: () => void) => void;
  onSaveProfileName?: (name: string) => void;
  onSaveProfileSetup?: (profile: UserProfile) => Promise<boolean>;
  onLinkedInImported?: () => void;
  supabase?: SupabaseClient | null;
  siteUrl?: string;
  profile?: UserProfile;
  profileLoaded?: boolean;
  profileSaving?: boolean;
  linkedInImportFresh?: boolean;
  roleBrief?: PublicRoleBrief | null;
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
  onRegisterOpenOnboarding,
  onSaveProfileName,
  onSaveProfileSetup,
  onLinkedInImported,
  supabase,
  siteUrl = '',
  profile,
  profileLoaded = true,
  profileSaving = false,
  linkedInImportFresh = false,
  roleBrief,
}: ExperienceChatProps) {
  const [input, setInput] = useState('');
  const [showTyping, setShowTyping] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [linkedInImportDismissed, setLinkedInImportDismissed] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>('intro');
  const [onboardingTranscript, setOnboardingTranscript] = useState('');
  const [onboardingName, setOnboardingName] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [clarityReview, setClarityReview] = useState<{ transcript: string } | null>(null);
  const [promptPulse, setPromptPulse] = useState(false);
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
  const hasUserMessages = messages.some((message) => message.role === 'user');
  const needsProfileSetup = Boolean(profile && profileLoaded && !profileSetupComplete(profile));
  const showProfileSetup = needsProfileSetup && !hasUserMessages && !showOnboarding;
  const showLinkedInImport =
    Boolean(profile) &&
    profileSetupComplete(profile!) &&
    shouldShowLinkedInImportCard(profile!, hasUserMessages) &&
    !linkedInImportDismissed &&
    !showOnboarding;

  useEffect(() => {
    if (linkedInImportFresh) setLinkedInImportDismissed(false);
  }, [linkedInImportFresh]);

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
      if (showOnboarding) {
        const transcript = text.trim();
        setOnboardingTranscript(transcript);

        if (onboardingStep === 'mic') {
          const knownName = profile?.fullName?.trim() || onboardingName.trim();
          if (knownName) {
            setOnboardingName(knownName);
            setOnboardingStep('ready');
            speak(`Great. I can hear you, ${knownName.split(/\s+/)[0]}. When you're ready, start the interview.`);
          } else {
            setOnboardingStep('name');
            speak("Great. I can hear you. Now tap the mic once more and say your name as you'd like it on the CV.");
          }
          return;
        }

        if (onboardingStep === 'name') {
          setOnboardingName(transcript);
          setOnboardingStep('ready');
          speak(`Perfect. I will put ${transcript} at the top of your CV. When you're ready, start the interview.`);
          return;
        }

        return;
      }

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
    if (needsProfileSetup) return;
    setShowOnboarding(!window.localStorage.getItem(ONBOARDING_KEY));
  }, [needsProfileSetup]);

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

    if (showOnboarding || !hydrated || !currentPrompt || finished || generating) return;

    const timer = window.setTimeout(() => {
      speak(currentPrompt);
    }, 350);

    return () => {
      window.clearTimeout(timer);
      cancel();
    };
  }, [
    cancel,
    currentPrompt,
    finished,
    generating,
    hydrated,
    showOnboarding,
    speak,
    thinking,
    voice.active,
    voice.transcribing,
  ]);

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

  const openOnboarding = useCallback(() => {
    setOnboardingStep('intro');
    setOnboardingTranscript('');
    setOnboardingName('');
    setVoiceError(null);
    setShowOnboarding(true);
    cancel();
  }, [cancel]);

  useEffect(() => {
    onRegisterOpenOnboarding?.(openOnboarding);
  }, [onRegisterOpenOnboarding, openOnboarding]);

  function dismissOnboarding() {
    window.localStorage.setItem(ONBOARDING_KEY, '1');
    setShowOnboarding(false);
    cancel();
  }

  function handleHearOnboardingIntro() {
    speak(
      "Welcome to Ceevie. This is a voice interview studio. I will ask short questions, you answer naturally, and your CV will write itself on the page beside you."
    );
  }

  function handleStartOnboardingMicCheck() {
    setVoiceError(null);
    setOnboardingTranscript('');
    setOnboardingStep('mic');
    speak('Tap the microphone and say: I am ready to build my CV.');
  }

  function handlePromptForOnboardingName() {
    setVoiceError(null);
    setOnboardingTranscript('');
    setOnboardingStep('name');
    speak("Tap the microphone and say your name as you'd like it to appear on your CV.");
  }

  function handleStartInterviewFromOnboarding() {
    const name = (onboardingName.trim() || profile?.fullName?.trim()) ?? '';
    dismissOnboarding();
    if (name && !answers.fullName.trim()) {
      onSaveProfileName?.(name);
      onSend(name);
    }
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
      ? 'Starting…'
      : voice.state === 'recording'
        ? 'Tap to finish'
        : voice.state === 'listening'
          ? 'Tap when done'
          : voice.transcribing
            ? 'Processing…'
            : 'Tap to speak';

  return (
    <section className="chat-panel">
      <div className="chat-panel-header">
        <div className="chat-studio-intro">
          <p className="panel-title">Interview studio</p>
          <h2 className="panel-heading">Speak. We write.</h2>
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

      {roleBrief ? <RoleBriefBanner brief={roleBrief} /> : null}

      {showProfileSetup && profile && onSaveProfileSetup ? (
        <ProfileSetupCard
          profile={profile}
          saving={profileSaving}
          supabase={supabase}
          siteUrl={siteUrl}
          onContinue={onSaveProfileSetup}
          onLinkedInImported={onLinkedInImported}
        />
      ) : showOnboarding ? (
        <VoiceOnboardingFlow
          step={onboardingStep}
          voice={voice}
          transcript={onboardingTranscript}
          capturedName={onboardingName || profile?.fullName || ''}
          voiceError={voiceError}
          onHearIntro={handleHearOnboardingIntro}
          onStartMicCheck={handleStartOnboardingMicCheck}
          onCaptureName={handlePromptForOnboardingName}
          onStartInterview={handleStartInterviewFromOnboarding}
          onSkip={dismissOnboarding}
        />
      ) : (
        <>
          {showLinkedInImport && profile && (
            <LinkedInImportCard
              profile={profile}
              onStart={() => setLinkedInImportDismissed(true)}
              onDismiss={() => setLinkedInImportDismissed(true)}
            />
          )}

          {!finished && !generating && currentPrompt && (
            <div className="chat-current-question" aria-live="polite">
              <div className="chat-current-question-head">
                <span className="chat-current-question-label">Ceevie asks</span>
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
              <div className="chat-welcome chat-welcome-breakthrough">
                <p className="chat-welcome-manifesto">You don&apos;t write CVs.</p>
                <h3 className="chat-welcome-headline">You tell your story.</h3>
                <p className="chat-welcome-text">
                  Tap the mic below. Every answer materializes on your live CV — no templates, no blank boxes, no
                  writer&apos;s block.
                </p>
                <div className="chat-welcome-steps" aria-hidden="true">
                  <span>Tap</span>
                  <span aria-hidden="true">→</span>
                  <span>Speak</span>
                  <span aria-hidden="true">→</span>
                  <span>Watch it appear</span>
                </div>
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
              <div className="chat-complete chat-complete-breakthrough">
                <p className="chat-complete-kicker">Your story is complete</p>
                <p>
                  {canGenerate
                    ? 'One tap turns everything you said into a polished, professional CV.'
                    : 'Almost there — fill the remaining sections on the document or keep talking.'}
                </p>
                <button type="button" className="btn btn-primary btn-build-cv" onClick={onGenerate} disabled={!canGenerate}>
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
        </>
      )}
    </section>
  );
}
