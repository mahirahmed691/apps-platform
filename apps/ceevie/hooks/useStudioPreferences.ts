'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'ceevie-studio-prefs';

export type StudioPreferences = {
  ceevieVoice: boolean;
  captureSound: boolean;
};

const DEFAULT_PREFS: StudioPreferences = {
  ceevieVoice: true,
  captureSound: true,
};

function readPrefs(): StudioPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFS;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<StudioPreferences>;
    return {
      ceevieVoice: parsed.ceevieVoice ?? DEFAULT_PREFS.ceevieVoice,
      captureSound: parsed.captureSound ?? DEFAULT_PREFS.captureSound,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function useStudioPreferences() {
  const [prefs, setPrefs] = useState<StudioPreferences>(DEFAULT_PREFS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPrefs(readPrefs());
    setHydrated(true);
  }, []);

  const persist = useCallback((next: StudioPreferences) => {
    setPrefs(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const toggleCeevieVoice = useCallback(() => {
    persist({ ...prefs, ceevieVoice: !prefs.ceevieVoice });
  }, [persist, prefs]);

  const toggleCaptureSound = useCallback(() => {
    persist({ ...prefs, captureSound: !prefs.captureSound });
  }, [persist, prefs]);

  return {
    prefs,
    hydrated,
    toggleCeevieVoice,
    toggleCaptureSound,
  };
}
