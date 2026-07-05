'use client';

import { ANSWER_LABELS, REQUIRED_CV_SECTIONS, type CvAnswers } from '@/lib/cvBuilder';

const SECTION_SUBTITLES: Partial<Record<keyof CvAnswers, string>> = {
  targetRole: 'The role you are aiming for',
  recentRole: 'Current or most recent position',
  achievements: 'Wins, metrics, and standout impact',
  experience: 'Previous roles and career history',
  skills: 'Tools, strengths, and certifications',
  education: 'Qualifications and training',
};

type CvPreviewProps = {
  answers: CvAnswers;
  finished: boolean;
  generating: boolean;
  onUpdateAnswer?: (key: keyof CvAnswers, value: string) => void;
};

export function CvPreview({ answers, finished, generating, onUpdateAnswer }: CvPreviewProps) {
  const filledSections = REQUIRED_CV_SECTIONS.filter((key) => answers[key].trim()).length;
  const progressPercent = Math.min((filledSections / REQUIRED_CV_SECTIONS.length) * 100, 100);

  if (generating) {
    return (
      <aside className="preview-panel">
        <p className="panel-title">Preview</p>
        <h2 className="panel-heading">Your CV</h2>
        <div className="result-loading">
          <div className="spinner" aria-hidden="true" />
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Turning your story into a professional CV…</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="preview-panel">
      <div className="preview-panel-header">
        <div>
          <p className="panel-title">Live preview</p>
          <h2 className="panel-heading">Your CV</h2>
        </div>
        {onUpdateAnswer && filledSections > 0 && (
          <span className="preview-edit-hint">Tap any section to edit</span>
        )}
      </div>

      <div className="preview-cv-progress" aria-label={`${filledSections} of ${REQUIRED_CV_SECTIONS.length} sections captured`}>
        <div className="preview-cv-progress-meta">
          <span className="preview-cv-progress-label">Sections captured</span>
          <span className="preview-cv-progress-count">
            {filledSections}/{REQUIRED_CV_SECTIONS.length}
          </span>
        </div>
        <div className="preview-cv-progress-track">
          <div className="preview-cv-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className="preview-cv">
        {REQUIRED_CV_SECTIONS.map((key, index) => {
          const value = answers[key].trim();
          const filled = Boolean(value);
          const label = ANSWER_LABELS[key];
          const subtitle = SECTION_SUBTITLES[key];

          return (
            <section
              key={key}
              className={`preview-section-card ${filled ? 'preview-section-card-filled' : 'preview-section-card-empty'} ${key === 'targetRole' ? 'preview-section-card-headline' : ''}`}
            >
              <div className="preview-section-card-head">
                <span className="preview-section-index" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="preview-section-heading">
                  <h3 className="preview-section-title">{label}</h3>
                  {subtitle && <p className="preview-section-subtitle">{subtitle}</p>}
                </div>
                <span className={`preview-section-badge ${filled ? 'preview-section-badge-done' : ''}`}>
                  {filled ? 'Captured' : 'Pending'}
                </span>
              </div>

              <div className="preview-section-card-body">
                {filled ? (
                  onUpdateAnswer ? (
                    key === 'targetRole' ? (
                      <input
                        className="preview-edit-title preview-section-input-title"
                        value={answers[key]}
                        onChange={(event) => onUpdateAnswer(key, event.target.value)}
                        aria-label={label}
                      />
                    ) : (
                      <textarea
                        className="preview-edit-field"
                        value={answers[key]}
                        rows={Math.max(3, answers[key].split('\n').length + 1)}
                        onChange={(event) => onUpdateAnswer(key, event.target.value)}
                        aria-label={label}
                      />
                    )
                  ) : key === 'targetRole' ? (
                    <p className="preview-section-content preview-section-content-headline">{value}</p>
                  ) : (
                    <p className="preview-section-content">{value}</p>
                  )
                ) : (
                  <p className="preview-section-placeholder">
                    {key === 'targetRole'
                      ? 'Your target role will appear here after you answer the first question.'
                      : `Your ${label.toLowerCase()} will appear here as you speak.`}
                  </p>
                )}
              </div>
            </section>
          );
        })}

        {!finished && filledSections > 0 && (
          <p className="preview-footnote">Keep talking — Ceevie asks follow-ups until your CV is complete.</p>
        )}

        {!finished && filledSections === 0 && (
          <p className="preview-footnote">Use the mic on the left — each answer fills a section here.</p>
        )}
      </div>
    </aside>
  );
}
