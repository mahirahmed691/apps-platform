'use client';

import { useState } from 'react';
import type { UsageInfo } from '@/hooks/useUsage';

type AppHeaderProps = {
  email?: string | null;
  usage?: UsageInfo | null;
  upgrading?: boolean;
  onUpgrade?: () => void;
  onSignOut: () => void;
  filledSections?: number;
  totalSections?: number;
  finished?: boolean;
};

export function AppHeader({
  email,
  usage,
  upgrading,
  onUpgrade,
  onSignOut,
  filledSections = 0,
  totalSections = 6,
  finished = false,
}: AppHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const showUpgrade = usage && usage.plan !== 'active' && onUpgrade;

  const progressPercent = totalSections > 0 ? Math.min((filledSections / totalSections) * 100, 100) : 0;
  const progressLabel = finished ? 'Ready to build' : `${filledSections}/${totalSections} sections`;

  return (
    <header className="app-header">
      <div className="app-brand">
        <h1>Ceevie</h1>
        <p>Talk through your experience — we write the CV</p>
      </div>

      {totalSections > 0 && (
        <div
          className="app-header-progress"
          aria-label={`${filledSections} of ${totalSections} CV sections captured`}
        >
          <span className="app-header-progress-label">{progressLabel}</span>
          <div className="app-header-progress-track">
            <div className="app-header-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      )}

      <div className="app-header-actions app-header-actions-desktop">
        {usage && (
          <span className="usage-badge" title={`${usage.remaining} of ${usage.dailyLimit} CV generations left today`}>
            {usage.remaining}/{usage.dailyLimit} left today
          </span>
        )}
        {showUpgrade && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={onUpgrade} disabled={upgrading}>
            {upgrading ? 'Loading…' : 'Upgrade'}
          </button>
        )}
        {email && (
          <span className="user-chip" title={email}>
            {email}
          </span>
        )}
        <button type="button" className="btn btn-ghost" onClick={onSignOut}>
          Sign out
        </button>
      </div>

      <div className="app-header-mobile">
        {usage && (
          <span className="usage-badge usage-badge-compact" title={`${usage.remaining} generations left today`}>
            {usage.remaining} left
          </span>
        )}
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          aria-expanded={menuOpen}
          aria-label="Account menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="6" r="1.5" fill="currentColor" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
            <circle cx="12" cy="18" r="1.5" fill="currentColor" />
          </svg>
        </button>
        {menuOpen && (
          <>
            <button
              type="button"
              className="app-header-menu-backdrop"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
            />
            <div className="app-header-menu" role="menu">
              {email && (
                <p className="app-header-menu-email" role="none" title={email}>
                  {email}
                </p>
              )}
              {showUpgrade && (
                <button
                  type="button"
                  className="app-header-menu-item"
                  role="menuitem"
                  disabled={upgrading}
                  onClick={() => {
                    setMenuOpen(false);
                    onUpgrade?.();
                  }}
                >
                  {upgrading ? 'Loading…' : 'Upgrade plan'}
                </button>
              )}
              <button
                type="button"
                className="app-header-menu-item app-header-menu-item-danger"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onSignOut();
                }}
              >
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
