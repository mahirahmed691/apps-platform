'use client';

type PreviewQuickActionsProps = {
  onCopy?: () => void;
  onDownload?: () => void;
  copyLabel?: string;
  downloading?: boolean;
  downloadDisabled?: boolean;
  compact?: boolean;
};

export function PreviewQuickActions({
  onCopy,
  onDownload,
  copyLabel = 'Copy',
  downloading = false,
  downloadDisabled = false,
  compact = false,
}: PreviewQuickActionsProps) {
  if (!onCopy && !onDownload) return null;

  return (
    <div className={`preview-quick-actions${compact ? ' preview-quick-actions-compact' : ''}`}>
      {onCopy ? (
        <button type="button" className="preview-quick-action" onClick={onCopy}>
          {copyLabel}
        </button>
      ) : null}
      {onDownload ? (
        <button
          type="button"
          className="preview-quick-action preview-quick-action-accent"
          onClick={onDownload}
          disabled={downloadDisabled || downloading}
        >
          {downloading ? 'Exporting…' : 'PDF'}
        </button>
      ) : null}
    </div>
  );
}
