'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'ceevie-preview-layout';

export type PreviewLayout = 'docked' | 'collapsed' | 'fullscreen';

function isMobilePreviewViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 900px)').matches;
}

function normalizeStoredLayout(stored: PreviewLayout | null): PreviewLayout {
  if (!stored) return 'docked';
  if (stored === 'collapsed' && isMobilePreviewViewport()) return 'docked';
  return stored;
}

export function usePreviewLayout(defaultLayout: PreviewLayout = 'docked') {
  const [layout, setLayout] = useState<PreviewLayout>(defaultLayout);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === 'docked' || stored === 'collapsed' || stored === 'fullscreen') {
        setLayout(normalizeStoredLayout(stored));
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const media = window.matchMedia('(max-width: 900px)');
    const sync = () => {
      if (media.matches && layout === 'collapsed') {
        setLayout('docked');
      }
    };
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [hydrated, layout]);

  const updateLayout = (next: PreviewLayout) => {
    const resolved = next === 'collapsed' && isMobilePreviewViewport() ? 'docked' : next;
    setLayout(resolved);
    try {
      if (isMobilePreviewViewport() && resolved === 'collapsed') return;
      window.localStorage.setItem(STORAGE_KEY, resolved);
    } catch {
      // ignore
    }
  };

  return { layout, setLayout: updateLayout, hydrated };
}
