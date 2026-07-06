'use client';

import { useEffect, useState } from 'react';
import { ANSWER_LABELS, type CvAnswers } from '@/lib/cvBuilder';

const REOPEN_SECTION_LABELS: Partial<Record<keyof CvAnswers, string>> = {
  recentRole: 'Recent role',
  achievements: 'Achievements',
  experience: 'Experience',
  skills: 'Skills',
};
import { useStudioPreferences } from '@/hooks/useStudioPreferences';
import { downloadCvPdf } from '@/lib/exportCvPdf';
import {
  clearOfflineQueue,
  enqueueOfflineAnswer,
  readOfflineQueue,
  removeOfflineItem,
  type OfflineQueueItem,
} from '@/lib/offlineQueue';

type VersionRow = { id: string; label: string; job_target: string; created_at: string; cover_letter?: string };
type ExportRow = { id: string; export_type: string; label: string; created_at: string };
type ShareRow = { url: string; label: string; created_at: string };
type AtsResult = { score: number; summary: string; missingKeywords: string[]; suggestions: string[] };

type StudioToolkitProps = {
  accessToken?: string;
  cv: string | null;
  answers: CvAnswers;
  language?: string;
  onCvUpdated: (next: string) => void;
  onApplyJob: (job: { title?: string; company?: string; description?: string; requirements?: string }) => void;
  onReopenSection?: (sectionId: keyof CvAnswers) => void;
  variant?: 'collapsible' | 'embedded';
  onNotify?: (message: string) => void;
};

export function StudioToolkit({
  accessToken,
  cv,
  answers,
  language = 'en',
  onCvUpdated,
  onApplyJob,
  onReopenSection,
  variant = 'collapsible',
  onNotify,
}: StudioToolkitProps) {
  const [open, setOpen] = useState(variant === 'embedded');
  const [jobInput, setJobInput] = useState('');
  const [importText, setImportText] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [ats, setAts] = useState<AtsResult | null>(null);
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [exports, setExports] = useState<ExportRow[]>([]);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [versionLabel, setVersionLabel] = useState('');
  const [diffText, setDiffText] = useState('');
  const [compareBefore, setCompareBefore] = useState('');
  const { prefs } = useStudioPreferences();
  const [busy, setBusy] = useState<string | null>(null);
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueItem[]>([]);
  const [referralUrl, setReferralUrl] = useState<string | null>(null);
  const [importQuestions, setImportQuestions] = useState<string[]>([]);

  useEffect(() => {
    setOfflineQueue(readOfflineQueue());
  }, []);

  async function apiPost<T>(path: string, payload: unknown): Promise<T | null> {
    if (!accessToken) return null;
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      onNotify?.('That action failed. Please try again.');
      return null;
    }
    return response.json() as Promise<T>;
  }

  async function refreshMeta() {
    if (!accessToken) return;
    const [versionsRes, exportsRes, referralRes] = await Promise.all([
      fetch('/api/cv/versions', { headers: { Authorization: `Bearer ${accessToken}` } }),
      fetch('/api/cv/exports', { headers: { Authorization: `Bearer ${accessToken}` } }),
      fetch('/api/referral', { headers: { Authorization: `Bearer ${accessToken}` } }),
    ]);
    if (versionsRes.ok) setVersions((await versionsRes.json()).versions ?? []);
    if (exportsRes.ok) setExports((await exportsRes.json()).exports ?? []);
    if (referralRes.ok) setReferralUrl((await referralRes.json()).shareUrl ?? null);
  }

  useEffect(() => {
    if (open || variant === 'embedded') void refreshMeta();
  }, [open, accessToken, variant]);

  if (!accessToken) return null;

  const panel = (
    <div className={`studio-toolkit-panel${variant === 'embedded' ? ' studio-toolkit-panel-embedded' : ''}`}>
          <section>
            <h3>Job tailoring</h3>
            <p className="studio-toolkit-copy">Paste a job URL or posting text.</p>
            <textarea value={jobInput} onChange={(e) => setJobInput(e.target.value)} rows={3} placeholder="https://… or paste the job ad" />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={busy === 'job' || !jobInput.trim()}
              onClick={async () => {
                setBusy('job');
                const data = await apiPost<{ job: { title?: string; company?: string; description?: string; requirements?: string } }>(
                  '/api/cv/job-url',
                  { input: jobInput }
                );
                if (data?.job) {
                  onApplyJob(data.job);
                  onNotify?.('Job details extracted — your interview is now tailored.');
                }
                setBusy(null);
              }}
            >
              Extract job details
            </button>
          </section>

          {cv && (
            <>
              <section>
                <h3>Cover letter</h3>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={busy === 'cover'}
                  onClick={async () => {
                    setBusy('cover');
                    const data = await apiPost<{ coverLetter: string }>('/api/cv/cover-letter', { cv, answers, language });
                    if (data?.coverLetter) {
                      setCoverLetter(data.coverLetter);
                      onNotify?.('Cover letter generated.');
                    }
                    setBusy(null);
                  }}
                >
                  Generate cover letter
                </button>
                {coverLetter ? <pre className="studio-toolkit-pre">{coverLetter}</pre> : null}
              </section>

              <section>
                <h3>ATS score</h3>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={busy === 'ats' || !answers.jobDescription.trim()}
                  onClick={async () => {
                    setBusy('ats');
                    const data = await apiPost<{ result: AtsResult }>('/api/cv/ats-score', {
                      cv,
                      jobDescription: answers.jobDescription,
                    });
                    if (data?.result) {
                      setAts(data.result);
                      onNotify?.(`ATS score: ${data.result.score}/100`);
                    }
                    setBusy(null);
                  }}
                >
                  Check ATS fit
                </button>
                {ats ? (
                  <div className="studio-toolkit-ats">
                    <strong>{ats.score}/100</strong>
                    <p>{ats.summary}</p>
                  </div>
                ) : null}
              </section>

              <section>
                <h3>Polish & templates</h3>
                <p className="studio-toolkit-copy">Pick a theme in the CV preview panel. PDF export uses the same style.</p>
                <div className="studio-toolkit-row">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={busy === 'polish'}
                    onClick={async () => {
                      setBusy('polish');
                      const data = await apiPost<{ cv: string }>('/api/cv/polish', { cv });
                      if (data?.cv) {
                        onCvUpdated(data.cv);
                        onNotify?.('CV bullets polished.');
                      }
                      setBusy(null);
                    }}
                  >
                    Polish bullets
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => void downloadCvPdf(cv, `ceevie-${prefs.cvStyle.presetId}.pdf`, prefs.cvStyle)}
                  >
                    Download PDF
                  </button>
                </div>
              </section>

              <section>
                <h3>Versions & history</h3>
                <div className="studio-toolkit-row">
                  <input value={versionLabel} onChange={(e) => setVersionLabel(e.target.value)} placeholder="Version label" />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={async () => {
                      await apiPost('/api/cv/versions', {
                        label: versionLabel || answers.targetRole || 'Saved version',
                        content: cv,
                        coverLetter,
                        jobTarget: answers.targetRole,
                      });
                      setVersionLabel('');
                      void refreshMeta();
                    }}
                  >
                    Save version
                  </button>
                </div>
                <ul className="studio-toolkit-list">
                  {versions.map((version) => (
                    <li key={version.id}>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={async () => {
                        const res = await fetch(`/api/cv/versions/${version.id}`, { headers: { Authorization: `Bearer ${accessToken}` } });
                        if (!res.ok) return;
                        const data = await res.json();
                        onCvUpdated(data.version.content);
                      }}>
                        Load {version.label}
                      </button>
                    </li>
                  ))}
                </ul>
                <ul className="studio-toolkit-list">
                  {exports.slice(0, 5).map((item) => (
                    <li key={item.id}>{item.label} · {item.export_type}</li>
                  ))}
                </ul>
              </section>

              <section>
                <h3>Share & review</h3>
                <div className="studio-toolkit-row">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={async () => {
                      const data = await apiPost<{ share: ShareRow }>('/api/cv/shares', { content: cv, label: answers.targetRole || 'Shared CV', expiresInDays: 14 });
                      if (data?.share?.url) {
                        setShareUrl(data.share.url);
                        await navigator.clipboard.writeText(data.share.url);
                      }
                    }}
                  >
                    Create share link
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={async () => {
                      await apiPost('/api/review/request', { content: cv });
                    }}
                  >
                    Request human review
                  </button>
                </div>
                {shareUrl ? <p className="studio-toolkit-copy">{shareUrl}</p> : null}
              </section>

              <section>
                <h3>Compare versions</h3>
                <textarea value={compareBefore} onChange={(e) => setCompareBefore(e.target.value)} rows={3} placeholder="Paste older version" />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={async () => {
                    const data = await apiPost<{ diff: string[] }>('/api/cv/diff', { before: compareBefore, after: cv });
                    if (data?.diff) setDiffText(data.diff.join('\n'));
                  }}
                >
                  Show diff
                </button>
                {diffText ? <pre className="studio-toolkit-pre">{diffText}</pre> : null}
              </section>
            </>
          )}

          <section>
            <h3>Import existing CV</h3>
            <textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={4} placeholder="Paste your old CV text" />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={!importText.trim()}
              onClick={async () => {
                const data = await apiPost<{ questions: string[] }>('/api/cv/import', { text: importText });
                if (data?.questions) setImportQuestions(data.questions);
              }}
            >
              Get refresh questions
            </button>
            {importQuestions.length > 0 ? (
              <ul className="studio-toolkit-list">
                {importQuestions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            ) : null}
          </section>

          <section>
            <h3>Offline queue</h3>
            <p className="studio-toolkit-copy">Answers saved locally when you are offline.</p>
            <ul className="studio-toolkit-list">
              {offlineQueue.map((item) => (
                <li key={item.id}>
                  {item.text.slice(0, 80)}
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOfflineQueue(removeOfflineItem(item.id))}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { clearOfflineQueue(); setOfflineQueue([]); }}>
              Clear queue
            </button>
          </section>

          {referralUrl ? (
            <section>
              <h3>Referral credits</h3>
              <p className="studio-toolkit-copy">Share Ceevie for bonus CV builds.</p>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => void navigator.clipboard.writeText(referralUrl)}>
                Copy referral link
              </button>
            </section>
          ) : null}

          {onReopenSection && (
            <section>
              <h3>Re-record a section</h3>
              <div className="studio-toolkit-row">
                {(['recentRole', 'achievements', 'experience', 'skills'] as const).map((key) => (
                  <button key={key} type="button" className="btn btn-ghost btn-sm" onClick={() => onReopenSection(key)}>
                    Re-do {REOPEN_SECTION_LABELS[key] ?? key}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
  );

  if (variant === 'embedded') {
    return <div className="studio-toolkit studio-toolkit-embedded">{panel}</div>;
  }

  return (
    <div className="studio-toolkit">
      <button type="button" className="btn btn-ghost btn-sm studio-toolkit-toggle" onClick={() => setOpen((v) => !v)}>
        {open ? 'Hide tools' : 'More tools'}
      </button>
      {open ? panel : null}
    </div>
  );
}

export function queueAnswerIfOffline(text: string) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    enqueueOfflineAnswer(text);
    return true;
  }
  return false;
}
