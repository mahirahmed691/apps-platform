'use client';

import { useEffect, useState } from 'react';
import type { UsageInfo } from '@/hooks/useUsage';
import { useStudioPreferences } from '@/hooks/useStudioPreferences';
import { StudioControls } from '@/components/StudioControls';
import { useCeevieVoice } from '@/hooks/useCeevieVoice';
import { UserAvatar } from '@/components/UserAvatar';

type AppHeaderProps = {
  email?: string | null;
  displayName?: string;
  avatarUrl?: string;
  usage?: UsageInfo | null;
  upgrading?: boolean;
  onUpgrade?: () => void;
  onSignOut: () => void;
  onOpenVoiceSetup?: () => void;
  onOpenProfile?: () => void;
  profileComplete?: boolean;
  filledSections?: number;
  totalSections?: number;
  finished?: boolean;
  showRecruiterLink?: boolean;
};

export function AppHeader({
  email,
  displayName,
  avatarUrl,
  usage,
  upgrading,
  onUpgrade,
  onSignOut,
  onOpenVoiceSetup,
  onOpenProfile,
  profileComplete = false,
  filledSections = 0,
  totalSections = 6,
  finished = false,
  showRecruiterLink = false,
}: AppHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { prefs, toggleCeevieVoice, toggleCaptureSound } = useStudioPreferences();
  const { supported: voiceOutSupported } = useCeevieVoice(prefs.ceevieVoice);
  const showUpgrade = usage && usage.plan !== 'active' && onUpgrade;

  const progressPercent = totalSections > 0 ? Math.min((filledSections / totalSections) * 100, 100) : 0;
  const progressLabel = finished ? 'Ready to build' : `${filledSections} of ${totalSections} sections captured`;

  function closeMenu() {
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!menuOpen) return undefined;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeMenu();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  return (
    <>
      <header className="app-header">
        <div className="app-brand">
          <h1>Ceevie</h1>
        </div>

        {totalSections > 0 && (
          <div className="app-header-progress" aria-label={progressLabel}>
            <div className="app-header-progress-track">
              <div className="app-header-progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        )}

        <div className="app-header-toolbar">
          <StudioControls
            ceevieVoice={prefs.ceevieVoice}
            captureSound={prefs.captureSound}
            voiceSupported={voiceOutSupported}
            onToggleVoice={toggleCeevieVoice}
            onToggleSound={toggleCaptureSound}
          />

          <button
            type="button"
            className="app-header-menu-btn"
            aria-expanded={menuOpen}
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {!profileComplete && <span className="profile-header-dot" aria-label="Profile incomplete" />}
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="app-nav-sheet-root" role="presentation">
          <button type="button" className="app-nav-sheet-backdrop" aria-label="Close menu" onClick={closeMenu} />
          <aside className="app-nav-sheet" role="dialog" aria-modal="true" aria-label="Account menu">
            <div className="app-nav-sheet-header">
              <div className="app-nav-sheet-user">
                <UserAvatar name={displayName} email={email} avatarUrl={avatarUrl} size="md" />
                <div>
                  <p className="app-nav-sheet-name">{displayName || email || 'Your account'}</p>
                  {email && displayName ? <p className="app-nav-sheet-email">{email}</p> : null}
                </div>
              </div>
              <button type="button" className="btn btn-ghost btn-icon app-nav-sheet-close" aria-label="Close menu" onClick={closeMenu}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {usage && (
              <p className="app-nav-sheet-meta">
                {usage.remaining} of {usage.dailyLimit} CV builds left today
              </p>
            )}

            <nav className="app-nav-sheet-links" aria-label="Account">
              {onOpenProfile && (
                <button
                  type="button"
                  className="app-nav-sheet-link"
                  onClick={() => {
                    closeMenu();
                    onOpenProfile();
                  }}
                >
                  Profile
                  {!profileComplete ? <span className="app-nav-sheet-link-note">Incomplete</span> : null}
                </button>
              )}
              {onOpenVoiceSetup && (
                <button
                  type="button"
                  className="app-nav-sheet-link"
                  onClick={() => {
                    closeMenu();
                    onOpenVoiceSetup();
                  }}
                >
                  Voice setup
                </button>
              )}
              {showRecruiterLink && (
                <a className="app-nav-sheet-link" href="/recruiter" onClick={closeMenu}>
                  Recruiter dashboard
                </a>
              )}
              {showUpgrade && (
                <button
                  type="button"
                  className="app-nav-sheet-link"
                  disabled={upgrading}
                  onClick={() => {
                    closeMenu();
                    onUpgrade?.();
                  }}
                >
                  {upgrading ? 'Loading…' : 'Upgrade plan'}
                </button>
              )}
              <button
                type="button"
                className="app-nav-sheet-link app-nav-sheet-link-danger"
                onClick={() => {
                  closeMenu();
                  onSignOut();
                }}
              >
                Sign out
              </button>
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
