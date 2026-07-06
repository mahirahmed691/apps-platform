'use client';

import { ANSWER_LABELS, REQUIRED_CV_SECTIONS, type CvAnswers } from '@/lib/cvBuilder';

type PreviewChecklistProps = {
  answers: CvAnswers;
  showEmptyHint?: boolean;
  onReopenSection?: (sectionId: keyof CvAnswers) => void;
  onJumpToSection?: (sectionId: keyof CvAnswers) => void;
  collapsible?: boolean;
};

export function PreviewChecklist({
  answers,
  showEmptyHint = false,
  onReopenSection,
  onJumpToSection,
  collapsible = false,
}: PreviewChecklistProps) {
  const filled = REQUIRED_CV_SECTIONS.filter((key) => answers[key].trim()).length;

  const items = (
    <ul className="preview-checklist-items">
      {REQUIRED_CV_SECTIONS.map((key) => {
        const done = Boolean(answers[key].trim());
        return (
          <li key={key} className={`preview-checklist-item ${done ? 'preview-checklist-item-done' : ''}`}>
            {onJumpToSection ? (
              <button type="button" className="preview-checklist-jump" onClick={() => onJumpToSection(key)}>
                <span className="preview-checklist-dot" aria-hidden="true">
                  {done ? (
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M2.5 6.25 5 8.75 9.5 3.75"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null}
                </span>
                <span>{ANSWER_LABELS[key]}</span>
              </button>
            ) : (
              <>
                <span className="preview-checklist-dot" aria-hidden="true">
                  {done ? (
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M2.5 6.25 5 8.75 9.5 3.75"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null}
                </span>
                <span>{ANSWER_LABELS[key]}</span>
              </>
            )}
            {done && onReopenSection ? (
              <button type="button" className="btn btn-ghost btn-sm preview-checklist-redo" onClick={() => onReopenSection(key)}>
                Re-record
              </button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );

  if (collapsible) {
    return (
      <details className="preview-checklist preview-checklist-collapsible" aria-label={`${filled} of ${REQUIRED_CV_SECTIONS.length} CV sections captured`}>
        <summary className="preview-checklist-summary">
          <span className="preview-checklist-label">Progress</span>
          <div className="preview-checklist-mini-track" aria-hidden="true">
            {REQUIRED_CV_SECTIONS.map((key) => (
              <span
                key={key}
                className={`preview-checklist-mini-segment ${answers[key].trim() ? 'preview-checklist-mini-segment-done' : ''}`}
              />
            ))}
          </div>
          <span className="preview-checklist-count">
            {filled}/{REQUIRED_CV_SECTIONS.length}
          </span>
          <svg className="preview-checklist-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </summary>
        {items}
        {showEmptyHint && filled === 0 && (
          <p className="preview-checklist-hint">
            Sections fill in here as you speak. Start with the mic on the left.
          </p>
        )}
      </details>
    );
  }

  return (
    <div className="preview-checklist" aria-label={`${filled} of ${REQUIRED_CV_SECTIONS.length} CV sections captured`}>
      <div className="preview-checklist-header">
        <span className="preview-checklist-label">Your CV progress</span>
        <span className="preview-checklist-count">
          {filled}/{REQUIRED_CV_SECTIONS.length}
        </span>
      </div>
      {items}
      {showEmptyHint && filled === 0 && (
        <p className="preview-checklist-hint">
          Sections fill in here as you speak. Start with the mic on the left.
        </p>
      )}
    </div>
  );
}
