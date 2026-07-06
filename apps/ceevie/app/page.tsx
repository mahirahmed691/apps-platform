'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseApiError, userHasLinkedInIdentity } from '@yourorg/app-core';
import { AppHeader } from '@/components/AppHeader';
import { CvPreview } from '@/components/CvPreview';
import { PreviewShell, PreviewRestorePill } from '@/components/PreviewShell';
import { ExperienceChat } from '@/components/ExperienceChat';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { MobileDocumentChrome } from '@/components/MobileDocumentChrome';
import { MobileToolsSheet } from '@/components/MobileToolsSheet';
import { ResultPanel } from '@/components/ResultPanel';
import { ProfilePanel } from '@/components/ProfilePanel';
import { StudioToolkit } from '@/components/StudioToolkit';
import { AuroraBackground } from '@/components/AuroraBackground';
import { LoadingScreen } from '@/components/LoadingScreen';
import { SetupRequired } from '@/components/SetupRequired';
import { StudioEntryGate } from '@/components/StudioEntryGate';
import { StudioOnboardingGate } from '@/components/StudioOnboardingGate';
import { useAuth } from '@/hooks/useAuth';
import { useCvConversation } from '@/hooks/useCvConversation';
import { useCvDraft, type DraftState } from '@/hooks/useCvDraft';
import { useRecruiter, useRoleBrief } from '@/hooks/useRecruiter';
import { useUsage } from '@/hooks/useUsage';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useStudioPreferences } from '@/hooks/useStudioPreferences';
import { usePreviewLayout } from '@/hooks/usePreviewLayout';
import { readPreviewEdits, clearPreviewEdits, usePersistPreviewEdits } from '@/hooks/usePreviewEditsStorage';
import { useIsMobile } from '@/hooks/useIsMobile';
import { buildCvPrompt, isReadyToGenerate, countFilledSections, REQUIRED_CV_SECTIONS, type CvAnswers } from '@/lib/cvBuilder';
import { writeMicGrantedLocally } from '@/lib/micAccess';
import { buildCvPreviewDocument } from '@/lib/cvPreviewDocument';
import { downloadCvPdf } from '@/lib/exportCvPdf';
import { serializeLiveCvForCopy } from '@/lib/serializeLiveCv';
import { parseGeneratedCvDocument } from '@/lib/parseGeneratedCv';
import { buildTailoringJobDescription, toTailorContext, type CompanyProfile } from '@/lib/companies';
import { useCompanyFollows } from '@/hooks/useCompanyFollows';
import { syncLinkedInProfileFromClient } from '@/lib/linkedinSyncClient';
import { profileNeedsLinkedInImport, profileSetupComplete, onboardingComplete, type UserProfile } from '@/lib/userProfile';
import { importUploadedCvText } from '@/lib/importUploadedCv';
import { hasRecoverableDraft, summarizeStudioDraft } from '@/lib/studioEntrySummary';
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
  const [companiesOpen, setCompaniesOpen] = useState(false);
  const [exportingCv, setExportingCv] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [cvCopied, setCvCopied] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [entryResolved, setEntryResolved] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<DraftState | null>(null);
  const [importingCv, setImportingCv] = useState(false);
  const [forceOnboarding, setForceOnboarding] = useState(false);
  const [onboardingFromWelcome, setOnboardingFromWelcome] = useState(false);
  const [returnToStudioAfterOnboarding, setReturnToStudioAfterOnboarding] = useState(false);
  const linkedInAutoSyncRef = useRef(false);

  const accessToken = session?.access_token;
  const userId = session?.user?.id;

  function openOnboardingGate(fromWelcome = false, returnToStudio = false) {
    setOnboardingFromWelcome(fromWelcome);
    setForceOnboarding(true);
    setReturnToStudioAfterOnboarding(returnToStudio);
    if (!returnToStudio) setEntryResolved(false);
  }

  function closeOnboardingGate() {
    setForceOnboarding(false);
    setOnboardingFromWelcome(false);
    if (returnToStudioAfterOnboarding) {
      setReturnToStudioAfterOnboarding(false);
      markInitialized();
      applyProfileContext(profile);
      setEntryResolved(true);
    }
  }

  function handleOpenVoiceSetup() {
    openOnboardingGate(true, entryResolved);
  }

  async function handleResetOnboarding() {
    writeMicGrantedLocally(false);
    await clearDraft();
    if (userId) clearPreviewEdits(userId);
    reset();
    setResult(null);
    setShowResult(false);
    setPendingDraft(null);
    await resetOnboarding();
    openOnboardingGate(true);
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
    updatePreviewEdit,
    previewEdits,
    reset,
    reopenSection,
    applyProfileContext,
    applyImport,
  } = conversation;

  const { prefs } = useStudioPreferences();
  const { layout: previewLayout, setLayout: setPreviewLayout } = usePreviewLayout();
  const isMobile = useIsMobile();
  const { companies: followedCompanyProfiles, followedIds } = useCompanyFollows(accessToken);

  const followedCompanyContexts = useMemo(
    () =>
      followedIds
        .map((id) => followedCompanyProfiles.find((company) => company.id === id))
        .filter(Boolean)
        .map((company) => toTailorContext(company as CompanyProfile)),
    [followedIds, followedCompanyProfiles]
  );

  const { usage, refresh: refreshUsage, upgrade, upgrading } = useUsage(accessToken);
  const { info: recruiterInfo } = useRecruiter(accessToken);
  const { activeBrief, loadFromDraft: loadActiveBrief } = useRoleBrief(accessToken);
  const { profile, loaded: profileLoaded, loadError: profileLoadError, saveStatus: profileSaveStatus, saveProfile, patchProfile, loadProfile, completeStudioSetup, resetOnboarding } =
    useUserProfile(accessToken);

  const draftState = useMemo(
    () => ({ answers, messages, finished, turnCount, generatedCv: result, previewEdits }),
    [answers, messages, finished, turnCount, result, previewEdits]
  );

  const { loadDraft, clearDraft, saveStatus } = useCvDraft(
    accessToken,
    initialized ? draftState : null,
    initialized
  );

  useEffect(() => {
    if (!accessToken || !profileLoaded) return;

    loadDraft()
      .then((draft) => {
        setPendingDraft(draft);
        setBootstrapping(false);
        setBootstrapError(null);
        void loadActiveBrief();
      })
      .catch(() => {
        setPendingDraft(null);
        setBootstrapping(false);
        setBootstrapError('Could not load your saved CV. You can start fresh below.');
      });
  }, [accessToken, profileLoaded, loadDraft, loadActiveBrief]);

  const draftSummary = useMemo(() => summarizeStudioDraft(pendingDraft), [pendingDraft]);

  function resolveEntryContinue(draft: DraftState) {
    const savedEdits = userId ? readPreviewEdits(userId) : {};
    const draftWithEdits = {
      ...draft,
      previewEdits: draft.previewEdits ?? savedEdits,
    };
    const savedCv = restoreDraft(draftWithEdits);
    applyProfileContext(profile);
    if (savedCv) {
      setResult(savedCv);
      setShowResult(true);
      setMobilePanel('preview');
    }
    setEntryResolved(true);
  }

  function handleEntryOnboarding() {
    openOnboardingGate(true);
  }

  async function handleEntryNew() {
    await clearDraft();
    if (userId) clearPreviewEdits(userId);
    reset();
    markInitialized();
    applyProfileContext(profile);
    setResult(null);
    setShowResult(false);
    setError(null);
    setPendingDraft(null);
    setEntryResolved(true);
    setMobilePanel('chat');
  }

  function handleEntryContinue() {
    if (!pendingDraft || !hasRecoverableDraft(pendingDraft)) {
      markInitialized();
      applyProfileContext(profile);
      setEntryResolved(true);
      return;
    }
    resolveEntryContinue(pendingDraft);
  }

  async function handleEntryUpload(text: string) {
    setImportingCv(true);
    setError(null);
    try {
      await clearDraft();
      if (userId) clearPreviewEdits(userId);

      const imported = importUploadedCvText(text, profile);
      const generatedCv = applyImport(imported, profile);

      setResult(generatedCv);
      setShowResult(true);
      setMobilePanel('preview');
      setPendingDraft(null);
      setEntryResolved(true);
      setNotice('CV imported — review on the preview, or keep interviewing to fill any gaps.');
    } catch {
      setError('Could not import that CV. Try plain text with section headings.');
    } finally {
      setImportingCv(false);
    }
  }

  function handleReopenEntryGate() {
    setPendingDraft({
      answers,
      messages,
      finished,
      turnCount,
      generatedCv: result,
      previewEdits,
    });
    setEntryResolved(false);
  }

  async function handleEntryLinkedIn() {
    setError(null);
    if (supabase && accessToken) {
      const result = await syncLinkedInProfileFromClient(supabase, accessToken, { retries: 3 });
      const nextProfile = result.ok ? await loadProfile() : null;
      if (nextProfile) {
        applyProfileContext(nextProfile);
        setLinkedInImportFresh(true);
        if (onboardingComplete(nextProfile)) {
          markInitialized();
          applyProfileContext(nextProfile);
          setEntryResolved(true);
          setNotice('LinkedIn basics applied — start the interview to capture your experience.');
          return;
        }
        openOnboardingGate(false);
        setNotice('LinkedIn imported — finish setup to enter the studio.');
        return;
      }
    }
    setNotice('Connect LinkedIn from onboarding extras, or try again in a moment.');
  }

  useEffect(() => {
    if (!initialized || !profileLoaded) return;
    applyProfileContext(profile);
  }, [initialized, profileLoaded, profile.fullName, profile.headline, applyProfileContext, profile]);

  useEffect(() => {
    if (!accessToken || !session?.user || !profileLoaded || !supabase || linkedInAutoSyncRef.current) return;
    if (forceOnboarding || !onboardingComplete(profile)) return;
    if (!userHasLinkedInIdentity(session.user) || !profileNeedsLinkedInImport(profile)) return;

    linkedInAutoSyncRef.current = true;
    void syncLinkedInProfileFromClient(supabase, accessToken, { retries: 3 }).then(async (result) => {
      if (!result.ok) return;
      const nextProfile = await loadProfile();
      if (nextProfile) applyProfileContext(nextProfile);
      setLinkedInImportFresh(true);
    });
  }, [accessToken, session?.user, profileLoaded, profile, forceOnboarding, loadProfile, applyProfileContext, supabase]);

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
      setShowResult(false);
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
        body: JSON.stringify({
          prompt: buildCvPrompt(
            answers,
            profile,
            prefs.language,
            followedCompanyContexts.length ? followedCompanyContexts : undefined,
            previewEdits
          ),
          language: prefs.language,
        }),
      });

      if (!response.ok) {
        const parsed = await parseApiError(response);
        if (parsed.kind === 'auth') {
          await supabase?.auth.signOut();
          router.replace('/login');
        }
        if (!result?.trim()) {
          setShowResult(false);
        } else if (response.status === 429) {
          setShowResult(true);
        }
        setError(parsed.message);
        return;
      }

      const data = await response.json();
      setResult(data.result ?? '');
      refreshUsage();
      if (accessToken && data.result) {
        void fetch('/api/cv/exports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ exportType: 'cv', label: answers.targetRole || 'Generated CV', content: data.result }),
        });
        void fetch('/api/cv/versions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ label: answers.targetRole || 'Latest CV', content: data.result, jobTarget: answers.targetRole }),
        });
      }
    } catch {
      setError('Something went wrong. Please try again.');
      if (!result?.trim()) setShowResult(false);
    } finally {
      setGenerating(false);
    }
  }

  async function handleStartOver() {
    await clearDraft();
    if (userId) clearPreviewEdits(userId);
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

  function handleApplyJob(job: { title?: string; company?: string; description?: string; requirements?: string }) {
    const jobDescription = [job.title, job.company, job.description, job.requirements].filter(Boolean).join('\n\n');
    updateAnswer('targetRole', job.title ?? answers.targetRole);
    updateAnswer('jobDescription', jobDescription);
    setNotice('Job details applied — your interview is now tailored to this posting.');
  }

  function handleTailorCompanies(selected: CompanyProfile[], workedAt: CompanyProfile[] = []) {
    if (selected.length === 0 && workedAt.length === 0) return;
    const jobDescription = buildTailoringJobDescription(selected, workedAt);
    updateAnswer('jobDescription', jobDescription);
    const names = Array.from(new Set([...workedAt, ...selected].map((company) => company.name))).join(', ');
    setNotice(
      `Tailoring applied for ${names}. We'll emphasise authentic past overlap and target-company signals.`
    );
  }

  async function handleProfileSetupComplete(next: UserProfile): Promise<boolean> {
    const ok = await saveProfile(next, { completeStudioSetup: true });
    if (ok) applyProfileContext(next);
    return ok;
  }

  async function handleCopyCv() {
    const text = result?.trim();
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCvCopied(true);
    window.setTimeout(() => setCvCopied(false), 2000);
  }

  async function handleCopyCurrentCv() {
    if (displayResult && result?.trim()) {
      await handleCopyCv();
      return;
    }

    const doc = buildCvPreviewDocument(answers, previewEdits);
    const text = serializeLiveCvForCopy(doc, profile);
    if (!text) return;

    await navigator.clipboard.writeText(text);
    setCvCopied(true);
    window.setTimeout(() => setCvCopied(false), 2000);
  }

  function cvWordCount(text: string | null): number {
    const trimmed = text?.trim() ?? '';
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }

  async function handleDownloadCv() {
    const doc = result?.trim()
      ? parseGeneratedCvDocument(result, {
          fullName: answers.fullName,
          targetRole: answers.targetRole,
          recentRole: answers.recentRole,
        })
      : buildCvPreviewDocument(answers, previewEdits);
    if (exportingCv) return;
    if (!doc.fullName.trim() && !doc.sections.some((section) => section.value.trim())) return;

    setExportingCv(true);
    try {
      await downloadCvPdf(doc, `ceevie-${prefs.cvStyle.presetId}.pdf`, prefs.cvStyle);
    } finally {
      setExportingCv(false);
    }
  }

  function handleOpenTools() {
    setToolsOpen(true);
  }

  usePersistPreviewEdits(userId, previewEdits, initialized && entryResolved);

  useEffect(() => {
    if (!profileLoaded || bootstrapping) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('onboarding') !== 'welcome') return;

    const url = new URL(window.location.href);
    url.searchParams.delete('onboarding');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);

    openOnboardingGate(true);
  }, [profileLoaded, bootstrapping]);

  const showOnboardingGate = profileLoaded && (forceOnboarding || !onboardingComplete(profile));

  if (!configured) return <SetupRequired />;
  if (loading || !profileLoaded || bootstrapping) {
    return <LoadingScreen />;
  }

  if (profileLoadError) {
    return (
      <div className="studio-bootstrap-error">
        <AuroraBackground />
        <div className="studio-bootstrap-error-inner">
          <h1>Something went wrong</h1>
          <p>{profileLoadError}</p>
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
            Refresh
          </button>
        </div>
      </div>
    );
  }

  if (showOnboardingGate) {
    return (
      <StudioOnboardingGate
        accessToken={accessToken}
        profile={profile}
        profileLoaded={profileLoaded}
        profileSaving={profileSaveStatus === 'saving'}
        supabase={supabase}
        siteUrl={getOAuthSiteUrl()}
        fromWelcome={onboardingFromWelcome}
        onComplete={closeOnboardingGate}
        onSaveProfileSetup={handleProfileSetupComplete}
        onCompleteStudioSetup={completeStudioSetup}
        onLinkedInImported={handleLinkedInImportedFromSetup}
      />
    );
  }

  if (!entryResolved) {
    return (
      <StudioEntryGate
        profile={profile}
        draftSummary={draftSummary}
        roleBriefTitle={activeBrief?.title ?? null}
        linkedInLinked={session?.user ? userHasLinkedInIdentity(session.user) : false}
        importing={importingCv}
        notice={bootstrapError}
        onContinue={handleEntryContinue}
        onNewCv={() => void handleEntryNew()}
        onUpload={(text) => void handleEntryUpload(text)}
        onOpenSetup={handleEntryOnboarding}
        onLinkedInStart={handleEntryLinkedIn}
      />
    );
  }

  if (!initialized) {
    return <LoadingScreen message="Opening your studio…" />;
  }

  const canGenerate = finished && isReadyToGenerate(answers);
  const filledSections = countFilledSections(answers);
  const canDownloadCv = Boolean(result?.trim()) || filledSections > 0;
  const displayResult = showResult && (Boolean(result) || generating);
  const workspaceLayout = displayResult ? 'fullscreen' : previewLayout;
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
        previewLayout={!displayResult ? previewLayout : undefined}
        onPreviewLayoutChange={!displayResult ? setPreviewLayout : undefined}
        onOpenCompanies={!displayResult ? () => setCompaniesOpen(true) : undefined}
        onOpenTools={handleOpenTools}
        onChangeProject={handleReopenEntryGate}
        showCompanies={!displayResult}
        onResetOnboarding={process.env.NODE_ENV !== 'production' ? () => void handleResetOnboarding() : undefined}
      />

      <div className={`workspace mobile-panel-${mobilePanel} workspace-preview-${workspaceLayout}${isMobile && mobilePanel === 'preview' ? ' workspace-mobile-doc' : ''}`}>
        {isMobile && mobilePanel === 'preview' ? (
          <MobileDocumentChrome
            title={sideTabLabel}
            filledSections={filledSections}
            totalSections={REQUIRED_CV_SECTIONS.length}
            finished={finished}
            isResult={displayResult}
            generating={generating && displayResult}
            canBuild={!displayResult && canGenerate}
            building={generating}
            onBuild={handleGenerate}
            wordCount={displayResult ? cvWordCount(result) : undefined}
            onOpenTools={handleOpenTools}
          />
        ) : null}
        <ExperienceChat
          accessToken={accessToken}
          profile={profile}
          profileLoaded={profileLoaded}
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
          mobilePanel={mobilePanel}
          previewLabel={sideTabLabel}
          showPreviewBadge={previewHasContent && !displayResult}
          onTailorCompanies={handleTailorCompanies}
          companiesOpen={companiesOpen}
          onCompaniesOpenChange={setCompaniesOpen}
        />

        {displayResult ? (
          <ResultPanel
            result={result}
            generating={generating}
            accessToken={accessToken}
            answers={answers}
            profile={profile}
            onProfilePatch={patchProfile}
            language={prefs.language}
            onResultChange={setResult}
            onApplyJob={handleApplyJob}
            onReopenSection={(sectionId: keyof CvAnswers) => {
              reopenSection(sectionId);
              setShowResult(false);
              setMobilePanel('chat');
            }}
            onStartOver={handleStartOver}
            onBackToEdit={handleBackToEdit}
            onRegenerate={handleGenerate}
          />
        ) : previewLayout !== 'collapsed' ? (
          <PreviewShell
            layout={previewLayout}
            onLayoutChange={setPreviewLayout}
            filledSections={filledSections}
            totalSections={REQUIRED_CV_SECTIONS.length}
          >
            <CvPreview
              answers={answers}
              finished={finished}
              generating={generating}
              previewEdits={previewEdits}
              profile={profile}
              onUpdateAnswer={updateAnswer}
              onPreviewEdit={updatePreviewEdit}
              onReopenSection={reopenSection}
              onProfilePatch={patchProfile}
              onCopy={() => void handleCopyCurrentCv()}
              onDownload={() => void handleDownloadCv()}
              copyLabel={cvCopied ? 'Copied' : 'Copy'}
              downloading={exportingCv}
              downloadDisabled={!canDownloadCv}
            />
          </PreviewShell>
        ) : (
          <PreviewRestorePill
            filledSections={filledSections}
            totalSections={REQUIRED_CV_SECTIONS.length}
            onRestore={() => setPreviewLayout('docked')}
          />
        )}

        {mobilePanel === 'preview' ? (
          <div className="mobile-studio-dock mobile-studio-dock-preview">
            <MobileBottomNav
              active="preview"
              previewLabel={sideTabLabel}
              showPreviewBadge={false}
              onChat={() => setMobilePanel('chat')}
              onPreview={() => setMobilePanel('preview')}
              onDownloadCv={() => void handleDownloadCv()}
              onCopyCv={canDownloadCv ? () => void handleCopyCurrentCv() : undefined}
              copyLabel={cvCopied ? 'Copied' : 'Copy'}
              downloadDisabled={!canDownloadCv}
              downloading={exportingCv}
              mode={displayResult ? 'result' : 'preview'}
            />
          </div>
        ) : null}
      </div>

      <MobileToolsSheet open={toolsOpen} onClose={() => setToolsOpen(false)} title="Studio tools">
        <StudioToolkit
          accessToken={accessToken}
          cv={result}
          answers={answers}
          language={prefs.language}
          onCvUpdated={setResult}
          onApplyJob={handleApplyJob}
          onReopenSection={(sectionId: keyof CvAnswers) => {
            reopenSection(sectionId);
            setShowResult(false);
            setMobilePanel('chat');
            setToolsOpen(false);
          }}
          variant="embedded"
          onNotify={(message) => setNotice(message)}
        />
      </MobileToolsSheet>

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
        accessToken={accessToken}
        linkedInLinked={session?.user ? userHasLinkedInIdentity(session.user) : false}
        onLinkedInSynced={() => {
          void loadProfile().then((nextProfile) => {
            if (!nextProfile) return;
            applyProfileContext(nextProfile);
            setLinkedInImportFresh(true);
          });
        }}
        onAccountDeleted={signOut}
      />
    </div>
  );
}
