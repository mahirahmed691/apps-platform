'use client';

import { useCallback, useRef, useState, type CSSProperties } from 'react';
import { AuroraBackground } from '@/components/AuroraBackground';
import { getProfileFirstName, type UserProfile } from '@/lib/userProfile';
import type { StudioDraftSummary } from '@/lib/studioEntrySummary';
import { draftProgressLabel } from '@/lib/studioEntrySummary';

const ACCEPTED_UPLOAD_TYPES = ['.txt', '.md', '.markdown', '.text'];
const MAX_UPLOAD_BYTES = 256_000;

type StudioEntryGateProps = {
  profile: UserProfile;
  draftSummary?: StudioDraftSummary | null;
  roleBriefTitle?: string | null;
  linkedInLinked?: boolean;
  importing?: boolean;
  notice?: string | null;
  onContinue: () => void;
  onNewCv: () => void;
  onUpload: (text: string) => void;
  onOpenSetup?: () => void;
  onLinkedInStart?: () => void;
};

type GateView = 'choose' | 'upload' | 'confirm-new';

function MicIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M19 11a7 7 0 0 1-14 0M12 18v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ResumeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 4h7l3 3v13H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M15 4v4h4M10 13h6M10 17h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 4v10m0 0 3.5-3.5M12 14l-3.5-3.5M5 18h14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StudioEntryGate({
  profile,
  draftSummary,
  roleBriefTitle,
  linkedInLinked = false,
  importing = false,
  notice = null,
  onContinue,
  onNewCv,
  onUpload,
  onOpenSetup,
  onLinkedInStart,
}: StudioEntryGateProps) {
  const [view, setView] = useState<GateView>('choose');
  const [uploadText, setUploadText] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const firstName = getProfileFirstName(profile);
  const hasDraft = Boolean(draftSummary);
  const progressPercent =
    draftSummary && draftSummary.totalSections > 0
      ? Math.min((draftSummary.filledSections / draftSummary.totalSections) * 100, 100)
      : 0;

  const readFile = useCallback(async (file: File) => {
    setUploadError(null);
    const name = file.name.toLowerCase();
    const allowed = ACCEPTED_UPLOAD_TYPES.some((ext) => name.endsWith(ext)) || file.type.startsWith('text/');
    if (!allowed) {
      setUploadError('Use a .txt or .md file, or paste your CV below.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError('File is too large — try a plain-text export under 250 KB.');
      return;
    }
    const text = await file.text();
    if (!text.trim()) {
      setUploadError('That file looks empty. Paste your CV or try another file.');
      return;
    }
    setUploadText(text);
  }, []);

  function handleImport() {
    const text = uploadText.trim();
    if (!text) {
      setUploadError('Paste your CV or drop a text file to continue.');
      return;
    }
    setUploadError(null);
    onUpload(text);
  }

  function handlePickNew() {
    if (hasDraft) {
      setView('confirm-new');
      return;
    }
    onNewCv();
  }

  return (
    <div className="studio-entry-screen">
      <AuroraBackground />
      <div className="studio-entry-shell">
        <header className="studio-entry-header">
          <p className="studio-entry-kicker">Ceevie studio</p>
          <h1>{firstName ? `What are we building, ${firstName}?` : 'What are you working on?'}</h1>
          <p className="studio-entry-lead">
            {roleBriefTitle
              ? `You have a role brief for ${roleBriefTitle}. Pick how you want to start.`
              : 'Start fresh, pick up where you left off, or bring an existing CV into the studio.'}
          </p>
        </header>

        {notice ? (
          <p className="studio-entry-notice" role="status">
            {notice}
          </p>
        ) : null}

        {view === 'choose' ? (
          <div className="studio-entry-grid">
            {hasDraft && draftSummary ? (
              <button type="button" className="studio-entry-card studio-entry-card-primary" onClick={onContinue}>
                <span className="studio-entry-card-icon" aria-hidden="true">
                  <ResumeIcon />
                </span>
                <span className="studio-entry-card-body">
                  <strong>Continue editing</strong>
                  <span>{draftProgressLabel(draftSummary)}</span>
                  {draftSummary.targetRole ? (
                    <span className="studio-entry-card-meta">{draftSummary.targetRole}</span>
                  ) : null}
                </span>
                <span
                  className="studio-entry-progress"
                  style={{ '--entry-progress': `${progressPercent}%` } as CSSProperties}
                  aria-hidden="true"
                >
                  <span className="studio-entry-progress-ring" />
                  <span>{draftSummary.filledSections}/{draftSummary.totalSections}</span>
                </span>
              </button>
            ) : null}

            <button type="button" className="studio-entry-card" onClick={handlePickNew}>
              <span className="studio-entry-card-icon" aria-hidden="true">
                <MicIcon />
              </span>
              <span className="studio-entry-card-body">
                <strong>Start a new CV</strong>
                <span>Voice interview — your CV writes itself as you speak.</span>
              </span>
            </button>

            <button type="button" className="studio-entry-card" onClick={() => setView('upload')}>
              <span className="studio-entry-card-icon" aria-hidden="true">
                <UploadIcon />
              </span>
              <span className="studio-entry-card-body">
                <strong>Upload existing CV</strong>
                <span>Paste or drop a .txt / .md file — we map sections automatically.</span>
              </span>
            </button>
          </div>
        ) : null}

        {view === 'confirm-new' ? (
          <div className="studio-entry-confirm">
            <h2>Start a new CV?</h2>
            <p>
              Your in-progress work will be replaced. You can always upload or re-do the interview later.
            </p>
            <div className="studio-entry-confirm-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setView('choose')}>
                Keep current draft
              </button>
              <button type="button" className="btn btn-primary" onClick={onNewCv}>
                Start fresh
              </button>
            </div>
          </div>
        ) : null}

        {view === 'upload' ? (
          <div className="studio-entry-upload">
            <button type="button" className="studio-entry-back" onClick={() => setView('choose')}>
              ← Back
            </button>

            <div
              className={`studio-entry-dropzone${dragOver ? ' studio-entry-dropzone-active' : ''}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragOver(false);
                const file = event.dataTransfer.files?.[0];
                if (file) void readFile(file);
              }}
            >
              <p className="studio-entry-dropzone-title">Drop your CV here</p>
              <p className="studio-entry-dropzone-hint">Plain text or Markdown · up to 250 KB</p>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()}>
                Choose file
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.markdown,.text,text/plain,text/markdown"
                className="studio-entry-file-input"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void readFile(file);
                  event.target.value = '';
                }}
              />
            </div>

            <label className="studio-entry-paste-label">
              <span>Or paste your CV</span>
              <textarea
                className="studio-entry-paste"
                value={uploadText}
                onChange={(event) => {
                  setUploadText(event.target.value);
                  setUploadError(null);
                }}
                placeholder="Name&#10;Target role&#10;&#10;Experience&#10;…"
                rows={8}
              />
            </label>

            {uploadError ? (
              <p className="studio-entry-error" role="alert">
                {uploadError}
              </p>
            ) : null}

            <div className="studio-entry-upload-actions">
              <button type="button" className="btn btn-primary" onClick={handleImport} disabled={importing}>
                {importing ? 'Importing…' : 'Import into studio'}
              </button>
            </div>

            <p className="studio-entry-upload-footnote">
              We extract sections automatically. You can edit on the page or continue the interview to fill gaps.
            </p>
          </div>
        ) : null}

        {view === 'choose' ? (
          <div className="studio-entry-secondary">
            {onOpenSetup ? (
              <button type="button" className="studio-entry-setup" onClick={onOpenSetup}>
                <span className="studio-entry-setup-icon" aria-hidden="true">
                  <MicIcon />
                </span>
                Studio setup
                <span className="studio-entry-setup-hint">Mic check · name · role · location</span>
              </button>
            ) : null}
            {linkedInLinked && onLinkedInStart ? (
              <button type="button" className="studio-entry-linkedin" onClick={onLinkedInStart}>
                Prefill from LinkedIn instead
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
