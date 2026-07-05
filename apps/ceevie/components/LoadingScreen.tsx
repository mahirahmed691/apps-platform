'use client';

import { AuroraBackground } from '@/components/AuroraBackground';

type LoadingScreenProps = {
  message?: string;
};

export function LoadingScreen({ message = 'Opening your studio…' }: LoadingScreenProps) {
  return (
    <div className="loading-screen loading-screen-aurora">
      <AuroraBackground />
      <div className="loading-brand" aria-busy="true" aria-live="polite">
        <div className="loading-mic-wrap" aria-hidden="true">
          <span className="loading-mic-ring" />
          <div className="loading-mic">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
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
        </div>
        <p className="loading-kicker">Voice-first CV builder</p>
        <p className="loading-title">Ceevie</p>
        <p className="loading-message">{message}</p>
      </div>
    </div>
  );
}
