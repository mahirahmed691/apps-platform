'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseApiError, userHasLinkedInIdentity } from '@yourorg/app-core';
import { AppHeader } from '@/components/AppHeader';
import { CvPreview } from '@/components/CvPreview';
import { ExperienceChat } from '@/components/ExperienceChat';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { ResultPanel } from '@/components/ResultPanel';
import { ProfilePanel } from '@/components/ProfilePanel';
import { AuroraBackground } from '@/components/AuroraBackground';
import { LoadingScreen } from '@/components/LoadingScreen';
import { SetupRequired } from '@/components/SetupRequired';
import { useAuth } from '@/hooks/useAuth';
import { useCvConversation } from '@/hooks/useCvConversation';
import { useCvDraft } from '@/hooks/useCvDraft';
import { useRecruiter, useRoleBrief } from '@/hooks/useRecruiter';
import { useUsage } from '@/hooks/useUsage';
import { useUserProfile } from '@/hooks/useUserProfile';
import { buildCvPrompt, isReadyToGenerate, countFilledSections, REQUIRED_CV_SECTIONS } from '@/lib/cvBuilder';
import { syncLinkedInProfileFromClient } from '@/lib/linkedinSyncClient';
import { profileNeedsLinkedInImport, profileSetupComplete, type UserProfile } from '@/lib/userProfile';
import { getOAuthSiteUrl } from '@/lib/site';

export default function Home() {
  const router = useRouter();
  const { session, loading, configured, supabase, signOut } = useAuth({ requireAuth: true });

  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<'chat' | 'preview'>('chat');
  const [profileOpen, setProfileOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [linkedInImportFresh, setLinkedInImportFresh] = useState(false);
  const openOnboardingRef = useRef<(() => void) | null>(null);
  const profilePrefilledRef = useRef(false);
  const linkedInAutoSyncRef = useRef(false);

  const accessToken = session?.access_token;

  function handleOpenVoiceSetup() {
    setMobilePanel('chat');
    openOnboardingRef.current?.();
  }

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
    applyProfileContext,
  } = conversation;

  const { usage, refresh: refreshUsage, upgrade, upgrading } = useUsage(accessToken);
  const { info: recruiterInfo } = useRecruiter(accessToken);
  const { activeBrief, loadFromDraft: loadActiveBrief } = useRoleBrief(accessToken);
  const { profile, loaded: profileLoaded, saveStatus: profileSaveStatus, saveProfile, patchProfile, loadProfile } =
    useUserProfile(accessToken);

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
      void loadActiveBrief();
    });
  }, [accessToken, initialized, loadDraft, restoreDraft, markInitialized, loadActiveBrief]);

  useEffect(() => {
    if (!initialized || !profileLoaded || profilePrefilledRef.current) return;
    profilePrefilledRef.current = true;
    applyProfileContext(profile);
  }, [initialized, profileLoaded, profile, applyProfileContext]);

  useEffect(() => {
    if (!accessToken || !session?.user || !profileLoaded || !supabase || linkedInAutoSyncRef.current) return;
    if (!userHasLinkedInIdentity(session.user) || !profileNeedsLinkedInImport(profile)) return;

    linkedInAutoSyncRef.current = true;
    void syncLinkedInProfileFromClient(supabase, accessToken, { retries: 3 }).then(async (result) => {
      if (!result.ok) return;
      const nextProfile = await loadProfile();
      if (nextProfile) applyProfileContext(nextProfile);
      setLinkedInImportFresh(true);
    });
  }, [accessToken, session?.user, profileLoaded, profile, loadProfile, applyProfileContext, supabase]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (new URLSearchParams(window.location.search).get('upgraded') === '1') {
      refreshUsage();
      router.replace('/', { scroll: false });
    }
  }, [refreshUsage, router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const linkedInParam = params.get('linkedin');
    if (!linkedInParam) return;

    router.replace('/', { scroll: false });

    if (linkedInParam === 'synced') {
      void loadProfile().then((nextProfile) => {
        if (!nextProfile) return;
        applyProfileContext(nextProfile);
      });
      setLinkedInImportFresh(true);
      setNotice(
        'LinkedIn connected. Your basics are imported — start the interview to capture your experience.'
      );
      return;
    }

    if (linkedInParam === 'sync-failed') {
      setError('LinkedIn connected, but we could not import your details. Try Refresh from LinkedIn in Profile.');
    }
  }, [router, loadProfile, applyProfileContext]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (new URLSearchParams(window.location.search).get('invite') !== 'accepted') return;
    setNotice('Role brief applied. Your interview is tailored to this opportunity.');
    void loadActiveBrief();
    router.replace('/', { scroll: false });
  }, [router, loadActiveBrief]);

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
        body: JSON.stringify({ prompt: buildCvPrompt(answers, profile) }),
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

  async function handleSaveProfileName(name: string) {
    void patchProfile({ fullName: name.trim() });
  }

  async function handleLinkedInImportedFromSetup() {
    const nextProfile = await loadProfile();
    if (nextProfile) applyProfileContext(nextProfile);
    setLinkedInImportFresh(true);
  }

  async function handleProfileSetupComplete(next: UserProfile): Promise<boolean> {
    const ok = await saveProfile(next);
    if (ok) applyProfileContext(next);
    return ok;
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
    <div className="app-shell studio-mode">
      <AuroraBackground />
      <AppHeader
        email={session?.user?.email}
        displayName={profile.fullName || undefined}
        avatarUrl={profile.avatarUrl}
        usage={usage}
        upgrading={upgrading}
        onUpgrade={handleUpgrade}
        onSignOut={signOut}
        onOpenVoiceSetup={handleOpenVoiceSetup}
        onOpenProfile={() => setProfileOpen(true)}
        profileComplete={profileSetupComplete(profile)}
        filledSections={filledSections}
        totalSections={REQUIRED_CV_SECTIONS.length}
        finished={finished}
        showRecruiterLink={recruiterInfo?.isRecruiter}
      />

      <div className={`workspace mobile-panel-${mobilePanel}`}>
        <ExperienceChat
          accessToken={accessToken}
          profile={profile}
          profileLoaded={profileLoaded}
          profileSaving={profileSaveStatus === 'saving'}
          linkedInImportFresh={linkedInImportFresh}
          roleBrief={activeBrief}
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
          onRegisterOpenOnboarding={(open) => {
            openOnboardingRef.current = open;
          }}
          onSaveProfileName={handleSaveProfileName}
          onSaveProfileSetup={handleProfileSetupComplete}
          onLinkedInImported={handleLinkedInImportedFromSetup}
          supabase={supabase}
          siteUrl={getOAuthSiteUrl()}
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

      {notice && (
        <div className="workspace-notice" role="status">
          <span>{notice}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setNotice(null)}>
            Dismiss
          </button>
        </div>
      )}

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

      <ProfilePanel
        open={profileOpen}
        profile={profile}
        saveStatus={profileSaveStatus}
        supabase={supabase}
        siteUrl={getOAuthSiteUrl()}
        onClose={() => setProfileOpen(false)}
        onSave={saveProfile}
        linkedInLinked={session?.user ? userHasLinkedInIdentity(session.user) : false}
        onLinkedInSynced={() => {
          void loadProfile().then((nextProfile) => {
            if (!nextProfile) return;
            applyProfileContext(nextProfile);
            setLinkedInImportFresh(true);
          });
        }}
      />
    </div>
  );
}
