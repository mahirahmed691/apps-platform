'use client';

import { useEffect, useRef, useState } from 'react';
import { ANSWER_LABELS, REQUIRED_CV_SECTIONS, type CvAnswers } from '@/lib/cvBuilder';
import { useStudioPreferences } from '@/hooks/useStudioPreferences';
import { playCaptureChime } from '@/lib/studioSounds';

const DOC_SECTIONS: (keyof CvAnswers)[] = ['achievements', 'experience', 'skills', 'education'];

const DOC_SECTION_LABELS: Partial<Record<keyof CvAnswers, string>> = {
  achievements: 'Key achievements',
  experience: 'Experience',
  skills: 'Skills',
  education: 'Education',
};

type CvPreviewProps = {
  answers: CvAnswers;
  finished: boolean;
  generating: boolean;
  onUpdateAnswer?: (key: keyof CvAnswers, value: string) => void;
};

export function CvPreview({ answers, finished, generating, onUpdateAnswer }: CvPreviewProps) {
  const { prefs, hydrated } = useStudioPreferences();
  const filledSections = REQUIRED_CV_SECTIONS.filter((key) => answers[key].trim()).length;
  const progressPercent = Math.min((filledSections / REQUIRED_CV_SECTIONS.length) * 100, 100);
  const prevFilledRef = useRef<Set<string>>(new Set());
  const [docPulse, setDocPulse] = useState(false);
  const [recentSection, setRecentSection] = useState<keyof CvAnswers | null>(null);
  const [captureLabel, setCaptureLabel] = useState<string | null>(null);

  const fullName = answers.fullName.trim();
  const targetRole = answers.targetRole.trim();
  const recentRole = answers.recentRole.trim();

  useEffect(() => {
    for (const key of REQUIRED_CV_SECTIONS) {
      const filled = Boolean(answers[key].trim());
      const wasFilled = prevFilledRef.current.has(key);

      if (filled && !wasFilled) {
        prevFilledRef.current.add(key);
        setRecentSection(key);
        setDocPulse(true);
        setCaptureLabel(ANSWER_LABELS[key]);

        if (hydrated && prefs.captureSound) {
          void playCaptureChime();
        }

        const timer = window.setTimeout(() => {
          setRecentSection(null);
          setDocPulse(false);
          setCaptureLabel(null);
        }, 1200);
        return () => window.clearTimeout(timer);
      }

      if (!filled && wasFilled) {
        prevFilledRef.current.delete(key);
      }
    }
    return undefined;
  }, [answers, hydrated, prefs.captureSound]);

  if (generating) {
    return (
      <aside className="preview-panel preview-panel-studio">
        <p className="panel-title">Live document</p>
        <h2 className="panel-heading">Materializing your CV</h2>
        <div className="preview-paper-stage">
          <div className="preview-doc preview-doc-generating">
            <div className="preview-doc-shimmer" aria-hidden="true" />
            <div className="result-loading">
              <div className="spinner" aria-hidden="true" />
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>Turning your story into a professional CV…</p>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="preview-panel preview-panel-studio">
      <div className="preview-panel-header">
        <div>
          <p className="panel-title">Live document</p>
          <h2 className="panel-heading">Your CV</h2>
        </div>
        <div className="preview-live-badge" aria-live="polite">
          {filledSections === 0 ? 'Waiting for your voice' : `${filledSections} sections captured`}
        </div>
      </div>

      <div className="preview-cv-progress" aria-label={`${filledSections} of ${REQUIRED_CV_SECTIONS.length} sections captured`}>
        <div className="preview-cv-progress-meta">
          <span className="preview-cv-progress-label">Building in real time</span>
          <span className="preview-cv-progress-count">
            {filledSections}/{REQUIRED_CV_SECTIONS.length}
          </span>
        </div>
        <div className="preview-cv-progress-track">
          <div className="preview-cv-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className="preview-paper-stage">
        {captureLabel && (
          <div className="capture-toast" role="status" aria-live="polite">
            <span className="capture-toast-dot" aria-hidden="true" />
            {captureLabel} captured
          </div>
        )}

        <article
          className={`preview-doc preview-doc-live ${docPulse ? 'preview-doc-capture' : ''} ${filledSections === 0 ? 'preview-doc-empty' : ''}`}
        >
          <header className="preview-doc-header">
            {fullName ? (
              onUpdateAnswer ? (
                <input
                  className="preview-doc-name-input"
                  value={answers.fullName}
                  onChange={(event) => onUpdateAnswer('fullName', event.target.value)}
                  aria-label={ANSWER_LABELS.fullName}
                />
              ) : (
                <h3>{fullName}</h3>
              )
            ) : (
              <div className="preview-doc-ghost preview-doc-ghost-name" aria-hidden="true" />
            )}

            {targetRole ? (
              onUpdateAnswer ? (
                <input
                  className="preview-doc-title-input"
                  value={answers.targetRole}
                  onChange={(event) => onUpdateAnswer('targetRole', event.target.value)}
                  aria-label={ANSWER_LABELS.targetRole}
                />
              ) : (
                <p className="preview-doc-role-line">{targetRole}</p>
              )
            ) : (
              <div className="preview-doc-ghost preview-doc-ghost-title" aria-hidden="true" />
            )}

            {recentRole ? (
              onUpdateAnswer ? (
                <textarea
                  className="preview-doc-subtitle-input"
                  value={answers.recentRole}
                  rows={Math.max(2, answers.recentRole.split('\n').length)}
                  onChange={(event) => onUpdateAnswer('recentRole', event.target.value)}
                  aria-label={ANSWER_LABELS.recentRole}
                />
              ) : (
                <p className="preview-doc-subtitle">{recentRole}</p>
              )
            ) : (
              <div className="preview-doc-ghost preview-doc-ghost-subtitle" aria-hidden="true" />
            )}
          </header>

          <div className="preview-sections">
            {DOC_SECTIONS.map((key) => {
              const value = answers[key].trim();
              const filled = Boolean(value);
              const label = DOC_SECTION_LABELS[key] ?? ANSWER_LABELS[key];
              const justCaptured = recentSection === key;

              return (
                <section
                  key={key}
                  className={`preview-section ${filled ? 'preview-section-filled' : 'preview-section-pending'} ${justCaptured ? 'preview-section-capture' : ''}`}
                >
                  <h4>{label}</h4>
                  {filled ? (
                    onUpdateAnswer ? (
                      <textarea
                        className="preview-edit-field preview-doc-field"
                        value={answers[key]}
                        rows={Math.max(3, answers[key].split('\n').length + 1)}
                        onChange={(event) => onUpdateAnswer(key, event.target.value)}
                        aria-label={label}
                      />
                    ) : (
                      <p>{value}</p>
                    )
                  ) : (
                    <div className="preview-doc-ghost-lines" aria-hidden="true">
                      <span />
                      <span />
                      <span className="preview-doc-ghost-lines-short" />
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </article>
      </div>

      {!finished && filledSections === 0 && (
        <p className="preview-footnote preview-footnote-studio">
          Speak on the left — each answer writes itself onto the page.
        </p>
      )}

      {!finished && filledSections > 0 && (
        <p className="preview-footnote preview-footnote-studio">Keep talking. Your CV is assembling itself.</p>
      )}
    </aside>
  );
}
