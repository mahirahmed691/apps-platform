'use client';

import type { CvQualityTip } from '@/lib/cvQualityTips';
import type { PreviewJumpTarget } from '@/lib/previewSectionScroll';

type CvQualityPanelProps = {
  tips: CvQualityTip[];
  onJump?: (target: PreviewJumpTarget) => void;
  compact?: boolean;
};

export function CvQualityPanel({ tips, onJump, compact = false }: CvQualityPanelProps) {
  if (tips.length === 0) return null;

  return (
    <aside className={`cv-quality-panel${compact ? ' cv-quality-panel-compact' : ''}`} aria-label="CV improvement tips">
      <div className="cv-quality-panel-head">
        <p className="cv-quality-panel-kicker">Make it stronger</p>
        {!compact ? <h3 className="cv-quality-panel-title">Quick wins</h3> : null}
      </div>
      <ul className="cv-quality-panel-list">
        {tips.map((tip) => (
          <li key={tip.id}>
            {onJump && tip.jumpTarget ? (
              <button type="button" className="cv-quality-tip" onClick={() => onJump(tip.jumpTarget!)}>
                <strong>{tip.label}</strong>
                <span>{tip.detail}</span>
              </button>
            ) : (
              <div className="cv-quality-tip cv-quality-tip-static">
                <strong>{tip.label}</strong>
                <span>{tip.detail}</span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
