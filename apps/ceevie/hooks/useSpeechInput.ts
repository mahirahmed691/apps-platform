'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type UseSpeechInputOptions = {
  onTranscript: (text: string) => void;
  onError?: (message: string) => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognition;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const ERROR_MESSAGES: Record<string, string> = {
  'not-allowed': 'Microphone access denied. Allow mic permission in your browser settings.',
  'no-speech': 'No speech detected. Try again or type instead.',
  network: 'Voice input needs an internet connection.',
  aborted: 'Voice input stopped.',
};

export function useSpeechInput({ onTranscript, onError }: UseSpeechInputOptions) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognition()));
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) return;

    stop();

    const recognition = new Ctor();
    recognition.lang = 'en-GB';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }
      if (transcript.trim()) onTranscript(transcript.trim());
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setListening(false);
      const message = ERROR_MESSAGES[event.error] ?? 'Voice input failed. Try typing instead.';
      onError?.(message);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }, [onTranscript, onError, stop]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  useEffect(() => () => stop(), [stop]);

  return { supported, listening, toggle, stop };
}
