'use client';

import { ReactNode } from 'react';
import type { PreviewLayout } from '@/hooks/usePreviewLayout';

type PreviewShellProps = {
  layout: PreviewLayout;
  onLayoutChange: (layout: PreviewLayout) => void;
  filledSections: number;
  totalSections: number;
  children: ReactNode;
};

type PreviewRestorePillProps = {
  filledSections: number;
  totalSections: number;
  onRestore: () => void;
};

export function PreviewRestorePill({ filledSections, totalSections, onRestore }: PreviewRestorePillProps) {
  return (
    <button
      type="button"
      className="preview-restore-pill"
      onClick={onRestore}
      aria-label="Show live CV preview"
    >
      <span className="preview-restore-pill-icon" aria-hidden="true">
        CV
      </span>
      <span className="preview-restore-pill-copy">
        <strong>Live CV</strong>
        <span>
          {filledSections}/{totalSections} sections
        </span>
      </span>
    </button>
  );
}

export function PreviewShell({
  layout,
  onLayoutChange,
  filledSections,
  totalSections,
  children,
}: PreviewShellProps) {
  if (layout === 'collapsed') {
    return null;
  }

  return (
    <div className={`preview-shell preview-shell-${layout}`}>
      <div className="preview-shell-toolbar">
        <span className="preview-shell-toolbar-label">Live CV</span>
        <div className="preview-shell-toolbar-actions">
          {layout === 'docked' ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onLayoutChange('fullscreen')}>
              Full screen
            </button>
          ) : (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onLayoutChange('docked')}>
              Exit full screen
            </button>
          )}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onLayoutChange('collapsed')}>
            Hide
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}
