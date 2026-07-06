'use client';

import { useEffect, useState } from 'react';
import { CvStylePanel } from '@/components/CvStylePanel';
import type { CvStyleConfig } from '@/lib/cvStyleConfig';

type PreviewStyleRailProps = {
  value: CvStyleConfig;
  onChange: (next: CvStyleConfig) => void;
};

export function PreviewStyleRail({ value, onChange }: PreviewStyleRailProps) {
  const [mobile, setMobile] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)');
    const sync = () => setMobile(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (!drawerOpen) return undefined;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setDrawerOpen(false);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [drawerOpen]);

  useEffect(() => {
    if (!mobile && drawerOpen) setDrawerOpen(false);
  }, [mobile, drawerOpen]);

  const panel = <CvStylePanel variant="rail" value={value} onChange={onChange} />;

  if (mobile) {
    return (
      <>
        <button
          type="button"
          className="preview-style-mobile-trigger"
          aria-expanded={drawerOpen}
          aria-controls="preview-style-drawer"
          onClick={() => setDrawerOpen(true)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 3v18M3 8h4l2-3 2 3h4M3 16h18"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Style
        </button>

        {drawerOpen ? (
          <div className="preview-style-drawer-root" role="presentation">
            <button
              type="button"
              className="preview-style-drawer-backdrop"
              aria-label="Close style panel"
              onClick={() => setDrawerOpen(false)}
            />
            <aside
              id="preview-style-drawer"
              className="preview-style-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="CV style"
            >
              <div className="preview-style-drawer-head">
                <div>
                  <p className="preview-style-drawer-kicker">Live document</p>
                  <h3>CV style</h3>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon preview-style-drawer-close"
                  aria-label="Close style panel"
                  onClick={() => setDrawerOpen(false)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <div className="preview-style-drawer-body preview-style-rail">{panel}</div>
            </aside>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <aside className="preview-style-rail" aria-label="CV style">
      {panel}
    </aside>
  );
}
