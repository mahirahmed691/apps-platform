type MobileBottomNavProps = {
  active: 'chat' | 'preview';
  previewLabel: string;
  showPreviewBadge: boolean;
  onChat: () => void;
  onPreview: () => void;
};

function ChatIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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

export function MobileBottomNav({
  active,
  previewLabel,
  showPreviewBadge,
  onChat,
  onPreview,
}: MobileBottomNavProps) {
  return (
    <nav className="mobile-bottom-nav" aria-label="Main navigation">
      <button
        type="button"
        className={`mobile-bottom-nav-item ${active === 'chat' ? 'mobile-bottom-nav-item-active' : ''}`}
        onClick={onChat}
        aria-current={active === 'chat' ? 'page' : undefined}
      >
        <ChatIcon />
        <span>Speak</span>
      </button>
      <button
        type="button"
        className={`mobile-bottom-nav-item ${active === 'preview' ? 'mobile-bottom-nav-item-active' : ''}`}
        onClick={onPreview}
        aria-current={active === 'preview' ? 'page' : undefined}
      >
        <span className="mobile-bottom-nav-icon-wrap">
          <DocIcon />
          {showPreviewBadge && <span className="mobile-bottom-nav-badge" aria-hidden="true" />}
        </span>
        <span>{previewLabel}</span>
      </button>
    </nav>
  );
}
