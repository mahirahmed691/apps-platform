'use client';

import { useRef, useState } from 'react';
import { downloadCvPdf } from '../lib/exportCvPdf';

type ResultPanelProps = {
  result: string | null;
  generating: boolean;
  onStartOver?: () => void;
  onBackToEdit?: () => void;
  onRegenerate?: () => void;
};

function wordCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function ResultPanel({
  result,
  generating,
  onStartOver,
  onBackToEdit,
  onRegenerate,
}: ResultPanelProps) {
  const [copied, setCopied] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  function handleDownloadTxt() {
    if (!result) return;
    const blob = new Blob([result], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ceevie-cv.txt';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleDownloadPdf() {
    if (!result || exportingPdf) return;
    setExportingPdf(true);
    try {
      await downloadCvPdf(result);
    } finally {
      setExportingPdf(false);
    }
  }

  function handlePrint() {
    if (!result) return;
    window.print();
  }

  return (
    <aside className="result-panel">
      <p className="panel-title">Output</p>
      <h2 className="panel-heading">Your CV</h2>

      {generating && (
        <div className="result-loading">
          <div className="spinner" aria-hidden="true" />
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Writing your CV from everything you shared…</p>
        </div>
      )}

      {!generating && !result && (
        <div className="result-empty">
          <strong>Your CV will appear here</strong>
          <span>Finish the conversation, then hit Build my CV.</span>
        </div>
      )}

      {!generating && result && (
        <>
          <div className="result-header">
            <span className="field-meta">{wordCount(result)} words</span>
            <div className="result-actions result-actions-primary">
              <button type="button" className="btn btn-primary" onClick={handleCopy}>
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleDownloadPdf}
                disabled={exportingPdf}
              >
                {exportingPdf ? 'Exporting…' : 'Download PDF'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleDownloadTxt}>
                Download .txt
              </button>
              <button type="button" className="btn btn-secondary" onClick={handlePrint}>
                Print
              </button>
            </div>
            <div className="result-actions result-actions-secondary">
              {onRegenerate && (
                <button type="button" className="btn btn-secondary" onClick={onRegenerate}>
                  Regenerate
                </button>
              )}
              {onBackToEdit && (
                <button type="button" className="btn btn-ghost" onClick={onBackToEdit}>
                  Back to edit
                </button>
              )}
              {onStartOver && (
                <button type="button" className="btn btn-ghost" onClick={onStartOver}>
                  Start over
                </button>
              )}
            </div>
          </div>
          <div className="result-body" ref={printRef}>
            <div className="result-printable">
              <pre className="result-text">{result}</pre>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
