'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ANSWER_LABELS, REQUIRED_CV_SECTIONS, type CvAnswers } from '@/lib/cvBuilder';
import {
  buildCvPreviewDocument,
  CV_SIDEBAR_COLUMN_SECTIONS,
  CV_SIDEBAR_MAIN_SECTIONS,
  CV_PREVIEW_SECTION_ORDER,
  type PreviewSectionKey,
} from '@/lib/cvPreviewDocument';
import { useStudioPreferences } from '@/hooks/useStudioPreferences';
import { useIsMobile } from '@/hooks/useIsMobile';
import { playCaptureChime } from '@/lib/studioSounds';
import { getCvQualityTips } from '@/lib/cvQualityTips';
import { answerKeyToJumpTarget, previewSectionId, scrollToPreviewSection } from '@/lib/previewSectionScroll';
import type { UserProfile } from '@/lib/userProfile';
import { PreviewChecklist } from '@/components/PreviewChecklist';
import { PreviewStyleRail } from '@/components/PreviewStyleRail';
import { PreviewQuickActions } from '@/components/PreviewQuickActions';
import { CvQualityPanel } from '@/components/CvQualityPanel';
import { CvContactBar } from '@/components/CvContactBar';
import { CvSectionContent } from '@/components/CvSectionContent';
import { CvExperienceEditor } from '@/components/CvExperienceEditor';
import { CvRecentRoleEditor } from '@/components/CvRecentRoleEditor';
import { resolveCvThemeTokens } from '@/lib/cvStyleConfig';
import { cvThemeToStyleVars } from '@/lib/cvThemeStyles';

type CvPreviewProps = {
  answers: CvAnswers;
  finished: boolean;
  generating: boolean;
  previewEdits?: Partial<Record<PreviewSectionKey, string>>;
  profile?: UserProfile;
  onUpdateAnswer?: (key: keyof CvAnswers, value: string) => void;
  onPreviewEdit?: (key: PreviewSectionKey, value: string) => void;
  onReopenSection?: (key: keyof CvAnswers) => void;
  onProfilePatch?: (patch: Partial<UserProfile>) => void;
  onCopy?: () => void;
  onDownload?: () => void;
  copyLabel?: string;
  downloading?: boolean;
  downloadDisabled?: boolean;
};

export function CvPreview({
  answers,
  finished,
  generating,
  previewEdits,
  profile,
  onUpdateAnswer,
  onPreviewEdit,
  onReopenSection,
  onProfilePatch,
  onCopy,
  onDownload,
  copyLabel = 'Copy',
  downloading = false,
  downloadDisabled = false,
}: CvPreviewProps) {
  const { prefs, hydrated, setCvStyle } = useStudioPreferences();
  const isMobile = useIsMobile();
  const filledSections = REQUIRED_CV_SECTIONS.filter((key) => answers[key].trim()).length;
  const prevFilledRef = useRef<Set<string>>(new Set());
  const [docPulse, setDocPulse] = useState(false);
  const [recentSection, setRecentSection] = useState<keyof CvAnswers | null>(null);
  const [captureLabel, setCaptureLabel] = useState<string | null>(null);
  const [checklistCollapsible, setChecklistCollapsible] = useState(false);

  const fullName = answers.fullName.trim();
  const targetRole = answers.targetRole.trim();
  const recentRole = answers.recentRole.trim();
  const liveSections = useMemo(
    () => buildCvPreviewDocument(answers, previewEdits).sections,
    [answers, previewEdits]
  );
  const cvThemeTokens = useMemo(() => resolveCvThemeTokens(prefs.cvStyle), [prefs.cvStyle]);
  const cvThemeVars = cvThemeToStyleVars(cvThemeTokens);
  const isSidebarLayout = cvThemeTokens.layout === 'sidebar';
  const qualityTips = useMemo(() => getCvQualityTips(answers, profile), [answers, profile]);

  function handleJumpToSection(key: keyof CvAnswers) {
    scrollToPreviewSection(answerKeyToJumpTarget(key));
  }

  function renderDocHeader(headerClassName?: string) {
    return (
      <header
        id={previewSectionId('header')}
        className={`preview-doc-header${headerClassName ? ` ${headerClassName}` : ''}`}
      >
        {fullName ? (
          onUpdateAnswer ? (
            <input
              className="preview-doc-name-input"
              value={answers.fullName}
              onChange={(event) => onUpdateAnswer('fullName', event.target.value)}
              aria-label={ANSWER_LABELS.fullName}
            />
          ) : (
            <h3>{fullName}</h3>
          )
        ) : (
          <div className="preview-doc-ghost preview-doc-ghost-name" aria-hidden="true" />
        )}

        {targetRole ? (
          onUpdateAnswer ? (
            <input
              className="preview-doc-title-input"
              value={answers.targetRole}
              onChange={(event) => onUpdateAnswer('targetRole', event.target.value)}
              aria-label={ANSWER_LABELS.targetRole}
            />
          ) : (
            <p className="preview-doc-role-line">{targetRole}</p>
          )
        ) : (
          <div className="preview-doc-ghost preview-doc-ghost-title" aria-hidden="true" />
        )}

        {isSidebarLayout && (recentRole || onUpdateAnswer) ? (
          onUpdateAnswer ? (
            <CvRecentRoleEditor
              value={answers.recentRole}
              onChange={(next) => onUpdateAnswer('recentRole', next)}
              ariaLabel={ANSWER_LABELS.recentRole}
              compact
            />
          ) : recentRole ? (
            <p className="preview-doc-subtitle">{recentRole}</p>
          ) : null
        ) : null}

        {!isSidebarLayout && (recentRole || onUpdateAnswer) ? (
          onUpdateAnswer ? (
            <CvRecentRoleEditor
              value={answers.recentRole}
              onChange={(next) => onUpdateAnswer('recentRole', next)}
              ariaLabel={ANSWER_LABELS.recentRole}
              compact
            />
          ) : recentRole ? (
            <p className="preview-doc-subtitle">{recentRole}</p>
          ) : null
        ) : !isSidebarLayout ? (
          <div className="preview-doc-ghost preview-doc-ghost-subtitle" aria-hidden="true" />
        ) : null}

        {profile ? (
          <CvContactBar
            profile={profile}
            editable={Boolean(onProfilePatch)}
            onProfileChange={onProfilePatch}
          />
        ) : null}
      </header>
    );
  }

  function sectionAnswerKey(key: PreviewSectionKey): keyof CvAnswers | null {
    if (key === 'achievements' || key === 'experience' || key === 'skills' || key === 'education') {
      return key;
    }
    return null;
  }

  function getEditableSectionValue(section: (typeof liveSections)[number]): string {
    const answerKey = sectionAnswerKey(section.key);
    if (answerKey && answers[answerKey].trim()) return answers[answerKey];
    if (section.key === 'summary' && previewEdits?.summary?.trim()) return previewEdits.summary;
    return section.value;
  }

  function handleSectionEdit(key: PreviewSectionKey, value: string) {
    const answerKey = sectionAnswerKey(key);
    if (answerKey && onUpdateAnswer) {
      onUpdateAnswer(answerKey, value);
      return;
    }
    onPreviewEdit?.(key, value);
  }

  function renderDocSection(key: PreviewSectionKey) {
    const section = liveSections.find((item) => item.key === key);
    const value = section?.value ?? '';
    const filled = Boolean(value);
    const sourceKey = section?.sourceKey;
    const label =
      section?.label ?? (key === 'summary' ? 'Professional summary' : key === 'achievements' ? 'Key achievements' : ANSWER_LABELS[key as keyof CvAnswers] ?? key);
    const justCaptured = sourceKey ? recentSection === sourceKey : false;
    const editable = Boolean(onUpdateAnswer || onPreviewEdit);
    const editValue = section ? getEditableSectionValue(section) : '';

    return (
      <section
        key={key}
        id={previewSectionId(key)}
        className={`preview-section ${filled ? 'preview-section-filled' : 'preview-section-pending'} ${justCaptured ? 'preview-section-capture' : ''}`}
      >
        <h4>{label}</h4>
        {filled ? (
          editable ? (
            key === 'experience' ? (
              <CvExperienceEditor
                value={editValue}
                onChange={(next) => handleSectionEdit('experience', next)}
                ariaLabel={label}
              />
            ) : (
              <textarea
                className="preview-edit-field preview-doc-field"
                value={editValue}
                rows={Math.max(3, editValue.split('\n').length + 1)}
                onChange={(event) => handleSectionEdit(key, event.target.value)}
                aria-label={label}
              />
            )
          ) : (
            <CvSectionContent
              value={value}
              sectionKey={key}
              format={prefs.cvStyle.contentFormat}
              generated={section?.generated}
            />
          )
        ) : (
          <div className="preview-doc-ghost-lines" aria-hidden="true">
            <span />
            <span />
            <span className="preview-doc-ghost-lines-short" />
          </div>
        )}
      </section>
    );
  }

  useEffect(() => {
    for (const key of REQUIRED_CV_SECTIONS) {
      const filled = Boolean(answers[key].trim());
      const wasFilled = prevFilledRef.current.has(key);

      if (filled && !wasFilled) {
        prevFilledRef.current.add(key);
        setRecentSection(key);
        setDocPulse(true);
        setCaptureLabel(ANSWER_LABELS[key]);

        if (hydrated && prefs.captureSound) {
          void playCaptureChime();
        }

        const timer = window.setTimeout(() => {
          setRecentSection(null);
          setDocPulse(false);
          setCaptureLabel(null);
        }, 1200);
        return () => window.clearTimeout(timer);
      }

      if (!filled && wasFilled) {
        prevFilledRef.current.delete(key);
      }
    }
    return undefined;
  }, [answers, hydrated, prefs.captureSound]);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 901px)');
    const update = () => setChecklistCollapsible(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  if (generating) {
    return (
      <aside className="preview-panel preview-panel-studio">
        <p className="panel-title">Live document</p>
        <h2 className="panel-heading">Materializing your CV</h2>
        <div className="preview-paper-stage">
          <div className="preview-doc preview-doc-generating">
            <div className="preview-doc-shimmer" aria-hidden="true" />
            <div className="result-loading">
              <div className="spinner" aria-hidden="true" />
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>Turning your story into a professional CV…</p>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="preview-panel preview-panel-studio">
      <div className="preview-panel-header">
        <div>
          <p className="panel-title">Live document</p>
          <h2 className="panel-heading">Your CV</h2>
        </div>
        <div className="preview-panel-header-actions">
          {!isMobile ? (
            <PreviewQuickActions
              onCopy={onCopy}
              onDownload={onDownload}
              copyLabel={copyLabel}
              downloading={downloading}
              downloadDisabled={downloadDisabled}
            />
          ) : null}
          <div className="preview-live-badge" aria-live="polite">
            {filledSections === 0 ? 'Waiting for your voice' : `${filledSections} captured`}
          </div>
        </div>
      </div>

      <PreviewChecklist
        answers={answers}
        onReopenSection={onReopenSection}
        onJumpToSection={handleJumpToSection}
        collapsible={checklistCollapsible}
      />

      {qualityTips.length > 0 ? (
        <CvQualityPanel
          tips={qualityTips}
          onJump={scrollToPreviewSection}
          compact={isMobile}
        />
      ) : null}

      <div className="preview-stage-wrap">
        <PreviewStyleRail value={prefs.cvStyle} onChange={setCvStyle} />

        <div className="preview-paper-stage">
        {captureLabel && (
          <div className="capture-toast" role="status" aria-live="polite">
            <span className="capture-toast-dot" aria-hidden="true" />
            {captureLabel} captured
          </div>
        )}

        <article
          data-cv-export-root="true"
          className={`preview-doc preview-doc-live preview-doc-theme-${prefs.cvStyle.presetId} preview-doc-layout-${cvThemeTokens.layout} preview-doc-divider-${cvThemeTokens.sectionDivider} preview-doc-density-${prefs.cvStyle.density} ${docPulse ? 'preview-doc-capture' : ''} ${filledSections === 0 ? 'preview-doc-empty' : ''}`}
          style={cvThemeVars}
        >
          {isSidebarLayout ? (
            <div className="preview-doc-sidebar-grid">
              <aside className="preview-doc-sidebar">
                {renderDocHeader('preview-doc-header-sidebar')}
                <div className="preview-sections preview-sections-sidebar">
                  {CV_SIDEBAR_COLUMN_SECTIONS.map(renderDocSection)}
                </div>
              </aside>
              <div className="preview-doc-main">
                <div className="preview-sections">{CV_SIDEBAR_MAIN_SECTIONS.map(renderDocSection)}</div>
              </div>
            </div>
          ) : (
            <>
              {renderDocHeader()}
              <div className="preview-sections">{CV_PREVIEW_SECTION_ORDER.map(renderDocSection)}</div>
            </>
          )}
        </article>
        </div>
      </div>

      {!finished && filledSections === 0 && (
        <p className="preview-footnote preview-footnote-studio">
          Speak on the left — each answer writes itself onto the page.
        </p>
      )}

      {!finished && filledSections > 0 && (
        <p className="preview-footnote preview-footnote-studio">
          Tap any section to edit titles, companies, dates, and details directly on the page.
        </p>
      )}
    </aside>
  );
}
