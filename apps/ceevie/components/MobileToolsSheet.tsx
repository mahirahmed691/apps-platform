'use client';

import { useEffect, type ReactNode } from 'react';

type MobileToolsSheetProps = {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
};

export function MobileToolsSheet({ open, title = 'Studio tools', onClose, children }: MobileToolsSheetProps) {
  useEffect(() => {
    if (!open) return undefined;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="mobile-tools-sheet-root" role="presentation">
      <button type="button" className="mobile-tools-sheet-backdrop" aria-label="Close tools" onClick={onClose} />
      <aside className="mobile-tools-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="mobile-tools-sheet-head">
          <h3>{title}</h3>
          <button type="button" className="btn btn-ghost btn-icon mobile-tools-sheet-close" aria-label="Close tools" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="mobile-tools-sheet-body">{children}</div>
      </aside>
    </div>
  );
}
