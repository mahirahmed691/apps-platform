'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'ceevie-studio-prefs';

export type StudioPreferences = {
  ceevieVoice: boolean;
  captureSound: boolean;
  coachMode: boolean;
  slowSpeechMode: boolean;
  language: string;
};

const DEFAULT_PREFS: StudioPreferences = {
  ceevieVoice: true,
  captureSound: true,
  coachMode: true,
  slowSpeechMode: false,
  language: 'en',
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
      coachMode: parsed.coachMode ?? DEFAULT_PREFS.coachMode,
      slowSpeechMode: parsed.slowSpeechMode ?? DEFAULT_PREFS.slowSpeechMode,
      language: parsed.language ?? DEFAULT_PREFS.language,
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

  const toggleCoachMode = useCallback(() => {
    persist({ ...prefs, coachMode: !prefs.coachMode });
  }, [persist, prefs]);

  const toggleSlowSpeechMode = useCallback(() => {
    persist({ ...prefs, slowSpeechMode: !prefs.slowSpeechMode });
  }, [persist, prefs]);

  const setLanguage = useCallback(
    (language: string) => {
      persist({ ...prefs, language });
    },
    [persist, prefs]
  );

  return {
    prefs,
    hydrated,
    toggleCeevieVoice,
    toggleCaptureSound,
    toggleCoachMode,
    toggleSlowSpeechMode,
    setLanguage,
  };
}
