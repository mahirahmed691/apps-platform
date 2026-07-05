import { ANSWER_LABELS, REQUIRED_CV_SECTIONS, type CvAnswers } from '@/lib/cvBuilder';

type PreviewChecklistProps = {
  answers: CvAnswers;
  showEmptyHint?: boolean;
};

export function PreviewChecklist({ answers, showEmptyHint = false }: PreviewChecklistProps) {
  const filled = REQUIRED_CV_SECTIONS.filter((key) => answers[key].trim()).length;

  return (
    <div className="preview-checklist" aria-label={`${filled} of ${REQUIRED_CV_SECTIONS.length} CV sections captured`}>
      <div className="preview-checklist-header">
        <span className="preview-checklist-label">Your CV progress</span>
        <span className="preview-checklist-count">
          {filled}/{REQUIRED_CV_SECTIONS.length}
        </span>
      </div>
      <ul className="preview-checklist-items">
        {REQUIRED_CV_SECTIONS.map((key) => {
          const done = Boolean(answers[key].trim());
          return (
            <li key={key} className={`preview-checklist-item ${done ? 'preview-checklist-item-done' : ''}`}>
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
            </li>
          );
        })}
      </ul>
      {showEmptyHint && filled === 0 && (
        <p className="preview-checklist-hint">
          Sections fill in here as you speak. Start with the mic on the left.
        </p>
      )}
    </div>
  );
}
