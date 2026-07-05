'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const enGb = voices.find((v) => v.lang.startsWith('en-GB') && !v.name.toLowerCase().includes('novelty'));
  if (enGb) return enGb;
  const en = voices.find((v) => v.lang.startsWith('en') && !v.name.toLowerCase().includes('novelty'));
  return en ?? voices[0];
}

export function useCeevieVoice(enabled: boolean) {
  const [supported, setSupported] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | undefined>(undefined);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    setSupported(true);

    function loadVoices() {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length) voiceRef.current = pickVoice(voices);
    }

    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);

  const cancel = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!enabled || !supported || typeof window === 'undefined') return;
      const trimmed = text.trim();
      if (!trimmed) return;

      cancel();

      const utterance = new SpeechSynthesisUtterance(trimmed);
      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.lang = 'en-GB';
      if (voiceRef.current) utterance.voice = voiceRef.current;

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [cancel, enabled, supported]
  );

  return { supported, speak, cancel };
}
