'use client';

type MobileDocumentChromeProps = {
  title: string;
  filledSections: number;
  totalSections: number;
  finished?: boolean;
  isResult?: boolean;
  generating?: boolean;
  canBuild?: boolean;
  building?: boolean;
  wordCount?: number;
  onOpenTools: () => void;
  onBuild?: () => void;
};

export function MobileDocumentChrome({
  title,
  filledSections,
  totalSections,
  finished = false,
  isResult = false,
  generating = false,
  canBuild = false,
  building = false,
  wordCount,
  onOpenTools,
  onBuild,
}: MobileDocumentChromeProps) {
  const progressPercent = totalSections > 0 ? Math.min((filledSections / totalSections) * 100, 100) : 0;
  const progressLabel = finished ? 'Ready to build' : `${filledSections} of ${totalSections} sections`;

  return (
    <header className="mobile-doc-chrome" aria-label="Document">
      <div className="mobile-doc-chrome-copy">
        <p className="mobile-doc-chrome-kicker">{isResult ? 'Output' : 'Live document'}</p>
        <h2 className="mobile-doc-chrome-title">{title}</h2>
        <p className="mobile-doc-chrome-meta">
          {generating
            ? 'Writing your CV from everything you shared…'
            : isResult
              ? `${wordCount ?? 0} words · tap fields to edit`
              : progressLabel}
        </p>
        {!isResult ? (
          <div className="mobile-doc-chrome-progress" aria-hidden="true">
            <div className="mobile-doc-chrome-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        ) : null}
      </div>
      <div className="mobile-doc-chrome-actions">
        {canBuild && onBuild ? (
          <button type="button" className="mobile-doc-chrome-build" onClick={onBuild} disabled={building}>
            {building ? 'Building…' : 'Build CV'}
          </button>
        ) : null}
        <button type="button" className="mobile-doc-chrome-tools" onClick={onOpenTools}>
          Tools
        </button>
      </div>
    </header>
  );
}
