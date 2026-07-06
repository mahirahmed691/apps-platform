'use client';

type MobileBottomNavProps = {
  active: 'chat' | 'preview';
  previewLabel: string;
  showPreviewBadge: boolean;
  onChat: () => void;
  onPreview: () => void;
  onDownloadCv?: () => void;
  onCopyCv?: () => void;
  copyLabel?: string;
  downloadDisabled?: boolean;
  downloading?: boolean;
  mode?: 'preview' | 'result';
};

function ChatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 8h10M7 12h6m-10 8 2.5-2.5H18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v11.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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

function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 4v10m0 0 3.5-3.5M12 14l-3.5-3.5M5 18h14"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MobileBottomNav({
  active,
  previewLabel,
  showPreviewBadge,
  onChat,
  onPreview,
  onDownloadCv,
  onCopyCv,
  copyLabel = 'Copy',
  downloadDisabled = false,
  downloading = false,
  mode = 'preview',
}: MobileBottomNavProps) {
  if (active === 'chat') {
    return (
      <nav className="mobile-bottom-nav mobile-bottom-nav-unified" aria-label="Main navigation">
        <button type="button" className="mobile-bottom-nav-switch" onClick={onPreview}>
          <span className="mobile-bottom-nav-icon-wrap">
            <DocIcon />
            {showPreviewBadge && <span className="mobile-bottom-nav-badge" aria-hidden="true" />}
          </span>
          <span>{previewLabel}</span>
        </button>
      </nav>
    );
  }

  return (
    <nav className={`mobile-bottom-nav mobile-bottom-nav-preview${mode === 'result' ? ' mobile-bottom-nav-result' : ''}`} aria-label="Preview actions">
      <button type="button" className="mobile-bottom-nav-action" onClick={onChat}>
        <ChatIcon />
        <span>Interview</span>
      </button>
      {onCopyCv ? (
        <button type="button" className="mobile-bottom-nav-action" onClick={onCopyCv}>
          <DocIcon />
          <span>{copyLabel}</span>
        </button>
      ) : null}
      <button
        type="button"
        className="mobile-bottom-nav-action mobile-bottom-nav-action-accent"
        onClick={onDownloadCv}
        disabled={downloadDisabled || downloading}
      >
        <DownloadIcon />
        <span>{downloading ? 'Exporting…' : mode === 'result' ? 'PDF' : 'Download'}</span>
      </button>
    </nav>
  );
}
