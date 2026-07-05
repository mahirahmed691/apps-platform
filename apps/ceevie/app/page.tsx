'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseApiError } from '@yourorg/app-core';
import { AppHeader } from '@/components/AppHeader';
import { CvPreview } from '@/components/CvPreview';
import { ExperienceChat } from '@/components/ExperienceChat';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { ResultPanel } from '@/components/ResultPanel';
import { LoadingScreen } from '@/components/LoadingScreen';
import { SetupRequired } from '@/components/SetupRequired';
import { useAuth } from '@/hooks/useAuth';
import { useCvConversation } from '@/hooks/useCvConversation';
import { useCvDraft } from '@/hooks/useCvDraft';
import { useUsage } from '@/hooks/useUsage';
import { buildCvPrompt, isReadyToGenerate, countFilledSections, REQUIRED_CV_SECTIONS } from '@/lib/cvBuilder';

export default function Home() {
  const router = useRouter();
  const { session, loading, configured, supabase, signOut } = useAuth({ requireAuth: true });

  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<'chat' | 'preview'>('chat');

  const accessToken = session?.access_token;

  const conversation = useCvConversation(accessToken);
  const {
    messages,
    answers,
    finished,
    thinking,
    turnCount,
    composerHint,
    composerPlaceholder,
    suggestions,
    initialized,
    restoreDraft,
    markInitialized,
    sendMessage,
    updateAnswer,
    reset,
  } = conversation;

  const { usage, refresh: refreshUsage, upgrade, upgrading } = useUsage(accessToken);

  const draftState = useMemo(
    () => ({ answers, messages, finished, turnCount, generatedCv: result }),
    [answers, messages, finished, turnCount, result]
  );

  const { loadDraft, clearDraft, saveStatus } = useCvDraft(
    accessToken,
    initialized ? draftState : null,
    initialized
  );

  useEffect(() => {
    if (!accessToken || initialized) return;

    loadDraft().then((draft) => {
      if (draft && draft.messages.length > 0) {
        const savedCv = restoreDraft(draft);
        if (savedCv) {
          setResult(savedCv);
          setShowResult(true);
          setMobilePanel('preview');
        }
      } else {
        markInitialized();
      }
    });
  }, [accessToken, initialized, loadDraft, restoreDraft, markInitialized]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (new URLSearchParams(window.location.search).get('upgraded') === '1') {
      refreshUsage();
      router.replace('/', { scroll: false });
    }
  }, [refreshUsage, router]);

  async function handleSend(text: string) {
    setError(null);
    await sendMessage(text, (message) => {
      if (message.toLowerCase().includes('unauthorized') || message.toLowerCase().includes('sign in')) {
        router.replace('/login');
      }
      setError(message);
    });
  }

  async function handleSkip() {
    setError(null);
    await sendMessage('(skipped)', (message) => setError(message));
  }

  async function handleGenerate() {
    setError(null);
    setShowResult(true);
    setMobilePanel('preview');

    if (!accessToken) {
      setError('Your session expired. Please sign in again.');
      router.replace('/login');
      return;
    }

    setGenerating(true);

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ prompt: buildCvPrompt(answers) }),
      });

      if (!response.ok) {
        const parsed = await parseApiError(response);
        if (parsed.kind === 'auth') {
          await supabase?.auth.signOut();
          router.replace('/login');
        }
        if (response.status === 429) {
          setShowResult(Boolean(result));
        }
        setError(parsed.message);
        return;
      }

      const data = await response.json();
      setResult(data.result ?? '');
      refreshUsage();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleStartOver() {
    await clearDraft();
    reset();
    setResult(null);
    setShowResult(false);
    setError(null);
  }

  function handleBackToEdit() {
    setShowResult(false);
    setError(null);
  }

  function handleUpgrade() {
    upgrade();
  }

  if (!configured) return <SetupRequired />;
  if (loading || !initialized) {
    return <LoadingScreen />;
  }

  const canGenerate = finished && isReadyToGenerate(answers);
  const filledSections = countFilledSections(answers);
  const displayResult = showResult && (Boolean(result) || generating);
  const sideTabLabel = displayResult ? 'Your CV' : 'Preview';
  const previewHasContent = filledSections > 0 || displayResult;

  return (
    <div className="app-shell">
      <AppHeader
        email={session?.user?.email}
        usage={usage}
        upgrading={upgrading}
        onUpgrade={handleUpgrade}
        onSignOut={signOut}
        filledSections={filledSections}
        totalSections={REQUIRED_CV_SECTIONS.length}
        finished={finished}
      />

      <div className={`workspace mobile-panel-${mobilePanel}`}>
        <ExperienceChat
          accessToken={accessToken}
          messages={messages}
          answers={answers}
          finished={finished}
          thinking={thinking}
          generating={generating}
          composerHint={composerHint}
          composerPlaceholder={composerPlaceholder}
          suggestions={suggestions}
          saveStatus={saveStatus}
          onSend={handleSend}
          onSkip={handleSkip}
          onGenerate={handleGenerate}
          canGenerate={canGenerate}
          filledSections={filledSections}
          showPreviewFab={false}
          onViewPreview={() => setMobilePanel('preview')}
        />

        {displayResult ? (
          <ResultPanel
            result={result}
            generating={generating}
            onStartOver={handleStartOver}
            onBackToEdit={handleBackToEdit}
            onRegenerate={handleGenerate}
          />
        ) : (
          <CvPreview
            answers={answers}
            finished={finished}
            generating={generating}
            onUpdateAnswer={updateAnswer}
          />
        )}

        <MobileBottomNav
          active={mobilePanel}
          previewLabel={sideTabLabel}
          showPreviewBadge={previewHasContent && !displayResult}
          onChat={() => setMobilePanel('chat')}
          onPreview={() => setMobilePanel('preview')}
        />
      </div>

      {error && (
        <div className="workspace-error" role="alert">
          <span>{error}</span>
          {error.toLowerCase().includes('upgrade') && usage?.plan !== 'active' && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={upgrade} disabled={upgrading}>
              Upgrade now
            </button>
          )}
        </div>
      )}
    </div>
  );
}
