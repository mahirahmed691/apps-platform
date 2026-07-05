'use client';

type StudioControlsProps = {
  ceevieVoice: boolean;
  captureSound: boolean;
  voiceSupported: boolean;
  onToggleVoice: () => void;
  onToggleSound: () => void;
};

export function StudioControls({
  ceevieVoice,
  captureSound,
  voiceSupported,
  onToggleVoice,
  onToggleSound,
}: StudioControlsProps) {
  return (
    <div className="studio-controls" role="group" aria-label="Studio settings">
      {voiceSupported && (
        <button
          type="button"
          className={`studio-control-btn ${ceevieVoice ? 'studio-control-btn-active' : ''}`}
          onClick={onToggleVoice}
          aria-pressed={ceevieVoice}
          title={ceevieVoice ? 'Ceevie voice on' : 'Ceevie voice off'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M11 5 6 9H3v6h3l5 4V5Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            {ceevieVoice ? (
              <path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8 8 0 0 1 0 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            ) : (
              <path d="m16 9 5 6M21 9l-5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            )}
          </svg>
          <span className="studio-control-label">Voice</span>
        </button>
      )}
      <button
        type="button"
        className={`studio-control-btn ${captureSound ? 'studio-control-btn-active' : ''}`}
        onClick={onToggleSound}
        aria-pressed={captureSound}
        title={captureSound ? 'Capture sounds on' : 'Capture sounds off'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M6 9a6 6 0 0 1 12 0v5a2 2 0 0 0 4 0V9a10 10 0 0 0-20 0v5a2 2 0 0 0 4 0V9Z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="M10 21h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span className="studio-control-label">Sound</span>
      </button>
    </div>
  );
}
