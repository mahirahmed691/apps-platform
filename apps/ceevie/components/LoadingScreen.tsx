type LoadingScreenProps = {
  message?: string;
};

export function LoadingScreen({ message = 'Loading your workspace…' }: LoadingScreenProps) {
  return (
    <div className="loading-screen">
      <div className="loading-brand" aria-busy="true" aria-live="polite">
        <div className="loading-mic" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M19 11a7 7 0 0 1-14 0M12 18v3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <p className="loading-title">Ceevie</p>
        <p className="loading-message">{message}</p>
      </div>
    </div>
  );
}
