'use client';

import { useMemo, useRef, useState } from 'react';
import { downloadCvPdf } from '../lib/exportCvPdf';
import { parseGeneratedCvDocument, serializeCvPreviewDocument } from '@/lib/parseGeneratedCv';
import { getCvQualityTips } from '@/lib/cvQualityTips';
import { scrollToPreviewSection } from '@/lib/previewSectionScroll';
import type { UserProfile } from '@/lib/userProfile';
import { StudioToolkit } from '@/components/StudioToolkit';
import { PreviewStyleRail } from '@/components/PreviewStyleRail';
import { EditableCvDocument } from '@/components/EditableCvDocument';
import { CvQualityPanel } from '@/components/CvQualityPanel';
import { useStudioPreferences } from '@/hooks/useStudioPreferences';
import { useIsMobile } from '@/hooks/useIsMobile';
import type { CvAnswers } from '@/lib/cvBuilder';

type ResultPanelProps = {
  result: string | null;
  generating: boolean;
  accessToken?: string;
  answers?: CvAnswers;
  profile?: UserProfile;
  onProfilePatch?: (patch: Partial<UserProfile>) => void;
  language?: string;
  onResultChange?: (next: string) => void;
  onApplyJob?: (job: { title?: string; company?: string; description?: string; requirements?: string }) => void;
  onReopenSection?: (sectionId: keyof CvAnswers) => void;
  onStartOver?: () => void;
  onBackToEdit?: () => void;
  onRegenerate?: () => void;
};

function wordCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function ResultPanel({
  result,
  generating,
  accessToken,
  answers,
  profile,
  onProfilePatch,
  language = 'en',
  onResultChange,
  onApplyJob,
  onReopenSection,
  onStartOver,
  onBackToEdit,
  onRegenerate,
}: ResultPanelProps) {
  const [copied, setCopied] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const { prefs, setCvStyle } = useStudioPreferences();
  const isMobile = useIsMobile();
  const parsedDocument = useMemo(
    () =>
      result
        ? parseGeneratedCvDocument(result, {
            fullName: answers?.fullName,
            targetRole: answers?.targetRole,
            recentRole: answers?.recentRole,
          })
        : null,
    [result, answers?.fullName, answers?.targetRole, answers?.recentRole]
  );
  const qualityTips = useMemo(
    () => (answers ? getCvQualityTips(answers, profile) : []),
    [answers, profile]
  );

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  function handleDownloadTxt() {
    if (!result) return;
    const blob = new Blob([result], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ceevie-cv.txt';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleDownloadPdf() {
    if (!result || exportingPdf) return;
    setExportingPdf(true);
    try {
      const doc = parseGeneratedCvDocument(result, {
        fullName: answers?.fullName,
        targetRole: answers?.targetRole,
        recentRole: answers?.recentRole,
      });
      await downloadCvPdf(doc, `ceevie-${prefs.cvStyle.presetId}.pdf`, prefs.cvStyle);
    } finally {
      setExportingPdf(false);
    }
  }

  function handlePrint() {
    if (!result) return;
    window.print();
  }

  return (
    <aside className={`result-panel${isMobile ? ' result-panel-mobile' : ''}`}>
      {!isMobile ? (
        <>
          <p className="panel-title">Output</p>
          <h2 className="panel-heading">Your CV</h2>
        </>
      ) : null}

      {generating && isMobile ? (
        <div className="result-loading result-loading-mobile">
          <div className="spinner" aria-hidden="true" />
        </div>
      ) : null}

      {generating && !isMobile ? (
        <div className="result-loading">
          <div className="spinner" aria-hidden="true" />
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Writing your CV from everything you shared…</p>
        </div>
      ) : null}

      {!generating && !result && (
        <div className="result-empty">
          <strong>Your CV will appear here</strong>
          <span>Finish the conversation, then hit Build my CV.</span>
        </div>
      )}

      {!generating && result && (
        <>
          <div className="result-header">
            {!isMobile ? <span className="field-meta">{wordCount(result)} words</span> : null}
            <div className="result-actions result-actions-primary">
              {!isMobile ? (
                <>
                  <button type="button" className="btn btn-primary" onClick={handleCopy}>
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleDownloadPdf}
                    disabled={exportingPdf}
                  >
                    {exportingPdf ? 'Exporting…' : 'Download PDF'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={handleDownloadTxt}>
                    Download .txt
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={handlePrint}>
                    Print
                  </button>
                </>
              ) : (
                <div className="result-actions-mobile-row">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleDownloadTxt}>
                    .txt
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handlePrint}>
                    Print
                  </button>
                  {onRegenerate ? (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={onRegenerate}>
                      Regenerate
                    </button>
                  ) : null}
                </div>
              )}
            </div>
            {!isMobile ? (
              <div className="result-actions result-actions-secondary">
                {onRegenerate && (
                  <button type="button" className="btn btn-secondary" onClick={onRegenerate}>
                    Regenerate
                  </button>
                )}
                {onBackToEdit && (
                  <button type="button" className="btn btn-ghost" onClick={onBackToEdit}>
                    Back to edit
                  </button>
                )}
                {onStartOver && (
                  <button type="button" className="btn btn-ghost" onClick={onStartOver}>
                    Start over
                  </button>
                )}
              </div>
            ) : (
              <div className="result-actions result-actions-secondary result-actions-mobile-secondary">
                {onBackToEdit ? (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={onBackToEdit}>
                    Back to edit
                  </button>
                ) : null}
                {onStartOver ? (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={onStartOver}>
                    Start over
                  </button>
                ) : null}
              </div>
            )}
          </div>
          {qualityTips.length > 0 ? (
            <CvQualityPanel tips={qualityTips} onJump={scrollToPreviewSection} compact={isMobile} />
          ) : null}
          <div className="result-stage-wrap">
            <PreviewStyleRail value={prefs.cvStyle} onChange={setCvStyle} />
            <div className="result-body" ref={printRef}>
              {parsedDocument ? (
                <EditableCvDocument
                  document={parsedDocument}
                  editable={Boolean(onResultChange)}
                  profile={profile}
                  onProfilePatch={onProfilePatch}
                  onDocumentChange={(next) => onResultChange?.(serializeCvPreviewDocument(next))}
                />
              ) : null}
            </div>
          </div>
          {answers && onResultChange && onApplyJob && !isMobile ? (
            <StudioToolkit
              accessToken={accessToken}
              cv={result}
              answers={answers}
              language={language}
              onCvUpdated={onResultChange}
              onApplyJob={onApplyJob}
              onReopenSection={onReopenSection}
            />
          ) : null}
        </>
      )}
    </aside>
  );
}
