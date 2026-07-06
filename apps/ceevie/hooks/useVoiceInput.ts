'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  acquireMicStream,
  isLiveAudioStream,
  queryMicPermission,
  releaseMicStream,
  writeMicGrantedLocally,
  type MicPermissionState,
} from '@/lib/micAccess';

export type VoiceMode = 'whisper' | 'browser';
export type VoiceState = 'idle' | 'starting' | 'listening' | 'recording' | 'transcribing';

type UseVoiceInputOptions = {
  accessToken?: string;
  onTranscript: (text: string) => void;
  onError?: (message: string) => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognition;

const ERROR_MESSAGES: Record<string, string> = {
  'not-allowed': 'Microphone access denied. Allow mic permission in your browser settings.',
  'no-speech': 'No speech detected. Try again.',
  network: 'Browser voice could not connect. Try Chrome or Safari, or enable server transcription.',
  aborted: 'Voice input stopped.',
  'service-not-allowed': 'Voice input is blocked. Try Chrome or Safari, or type instead.',
};

const IGNORED_WHILE_STOPPING = new Set(['aborted', 'no-speech', 'network']);

const MAX_RECORD_MS = 120_000;
const MIN_RECORD_MS = 1200;
const SILENCE_STOP_MS = 1800;
const SILENCE_RMS_THRESHOLD = 0.018;
const SILENCE_POLL_MS = 150;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function hasMediaRecorder(): boolean {
  return typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined';
}

function isSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Safari/i.test(navigator.userAgent) && !/Chrome|Chromium|CriOS|FxiOS/i.test(navigator.userAgent);
}

function pickMimeType(): string {
  if (!hasMediaRecorder()) return '';
  const types = isSafari()
    ? ['audio/mp4', 'audio/webm', 'audio/webm;codecs=opus', 'audio/ogg']
    : ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
}

function canUseWhisper(openaiConfigured: boolean): boolean {
  return openaiConfigured && hasMediaRecorder();
}

/** Combine every result segment — interim + final — into one string. */
function readTranscriptFromEvent(event: SpeechRecognitionEvent): string {
  let combined = '';
  for (let i = 0; i < event.results.length; i += 1) {
    combined += event.results[i][0].transcript;
  }
  return combined.trim();
}

export function useVoiceInput({ accessToken, onTranscript, onError }: UseVoiceInputOptions) {
  const [supported, setSupported] = useState(false);
  const [mode, setMode] = useState<VoiceMode>('browser');
  const [whisperAvailable, setWhisperAvailable] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [state, setState] = useState<VoiceState>('idle');
  const [interimText, setInterimText] = useState('');
  const [micPermission, setMicPermission] = useState<MicPermissionState>('prompt');
  const [micReady, setMicReady] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const browserTranscriptRef = useRef('');
  const recordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordStartedAtRef = useRef(0);
  const stoppingBrowserRef = useRef(false);
  const networkRetriedRef = useRef(false);
  const whisperAvailableRef = useRef(false);
  const startWhisperRef = useRef<() => void>(() => {});
  const silenceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSpeechActivityRef = useRef(0);
  const hadSpeechRef = useRef(false);
  const vadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const stopRef = useRef<() => void>(() => {});

  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onErrorRef.current = onError;
  }, [onTranscript, onError]);

  useEffect(() => {
    whisperAvailableRef.current = whisperAvailable;
  }, [whisperAvailable]);

  useEffect(() => {
    const hasMic = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
    const hasBrowserStt = Boolean(getSpeechRecognition());
    setSupported(hasMic || hasBrowserStt);
    if (!hasMic) return;

    void queryMicPermission().then((permission) => {
      setMicPermission(permission);
      if (permission === 'granted') setMicReady(true);
    });
  }, []);

  const ensureMicStream = useCallback(async (): Promise<MediaStream | null> => {
    const stream = await acquireMicStream(streamRef.current);
    if (stream) {
      streamRef.current = stream;
      setMicPermission('granted');
      setMicReady(true);
      writeMicGrantedLocally(true);
      return stream;
    }

    setMicPermission('denied');
    setMicReady(false);
    writeMicGrantedLocally(false);
    return null;
  }, []);

  const warmMic = useCallback(async (): Promise<boolean> => {
    if (!canUseWhisper(true) && !getSpeechRecognition()) return false;
    const stream = await ensureMicStream();
    return Boolean(stream);
  }, [ensureMicStream]);

  useEffect(() => {
    if (!accessToken) {
      setConfigLoaded(true);
      return;
    }

    let cancelled = false;

    fetch('/api/speech/config', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const whisper = Boolean(data?.whisper) && canUseWhisper(true);
        setWhisperAvailable(whisper);
        if (whisper) setMode('whisper');
        else if (getSpeechRecognition()) setMode('browser');
      })
      .catch(() => {
        if (cancelled) return;
        if (getSpeechRecognition()) setMode('browser');
      })
      .finally(() => {
        if (!cancelled) setConfigLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const resetIdle = useCallback(() => {
    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }
    setState('idle');
    setInterimText('');
    browserTranscriptRef.current = '';
    stoppingBrowserRef.current = false;
    networkRetriedRef.current = false;
    hadSpeechRef.current = false;
    lastSpeechActivityRef.current = 0;
  }, []);

  const deliverBrowserTranscript = useCallback(() => {
    const text = browserTranscriptRef.current.trim();
    resetIdle();
    if (text) {
      onTranscriptRef.current(text);
    } else {
      onErrorRef.current?.('No speech detected. Speak for a couple of seconds, then tap Stop.');
    }
  }, [resetIdle]);

  const cleanupStream = useCallback((release = false) => {
    if (!release && isLiveAudioStream(streamRef.current)) return;
    releaseMicStream(streamRef.current);
    streamRef.current = null;
    if (release) {
      setMicReady(false);
    }
  }, []);

  const clearSilenceMonitor = useCallback(() => {
    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const startSilenceMonitor = useCallback(() => {
    clearSilenceMonitor();
    silenceTimerRef.current = setInterval(() => {
      if (!hadSpeechRef.current) return;
      if (Date.now() - lastSpeechActivityRef.current < SILENCE_STOP_MS) return;
      stopRef.current();
    }, SILENCE_POLL_MS);
  }, [clearSilenceMonitor]);

  const markSpeechActivity = useCallback(() => {
    hadSpeechRef.current = true;
    lastSpeechActivityRef.current = Date.now();
  }, []);

  const startWhisperVad = useCallback((stream: MediaStream) => {
    if (typeof window === 'undefined') return;

    try {
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);

      vadIntervalRef.current = setInterval(() => {
        analyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (let i = 0; i < samples.length; i += 1) {
          const sample = (samples[i] - 128) / 128;
          sum += sample * sample;
        }
        const rms = Math.sqrt(sum / samples.length);
        const elapsed = Date.now() - recordStartedAtRef.current;

        if (rms > SILENCE_RMS_THRESHOLD) {
          markSpeechActivity();
          return;
        }

        if (
          hadSpeechRef.current &&
          elapsed >= MIN_RECORD_MS &&
          Date.now() - lastSpeechActivityRef.current >= SILENCE_STOP_MS
        ) {
          stopRef.current();
        }
      }, SILENCE_POLL_MS);
    } catch {
      /* VAD optional — manual stop still works */
    }
  }, [markSpeechActivity]);

  const stopBrowserEngine = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    try {
      recognition.stop();
    } catch {
      /* already stopped */
    }
  }, []);

  const requestStopBrowser = useCallback(() => {
    if (!recognitionRef.current) {
      deliverBrowserTranscript();
      return;
    }
    stoppingBrowserRef.current = true;
    stopBrowserEngine();
  }, [stopBrowserEngine, deliverBrowserTranscript]);

  const stopWhisper = useCallback(() => {
    if (recordTimerRef.current) {
      clearTimeout(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.requestData();
      } catch {
        /* optional */
      }
      recorder.stop();
    }
  }, []);

  const stop = useCallback(() => {
    if (state === 'listening' || state === 'starting' || recognitionRef.current) {
      requestStopBrowser();
      return;
    }

    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      const elapsed = Date.now() - recordStartedAtRef.current;
      if (elapsed < MIN_RECORD_MS && !hadSpeechRef.current) {
        onErrorRef.current?.('Speak for at least a second.');
        return;
      }
      setInterimText('Transcribing…');
      stopWhisper();
    }
  }, [state, requestStopBrowser, stopWhisper]);

  useEffect(() => {
    stopRef.current = stop;
  }, [stop]);

  const uploadRecording = useCallback(
    async (blob: Blob) => {
      if (!accessToken) {
        onErrorRef.current?.('Your session expired. Please sign in again.');
        resetIdle();
        return;
      }

      setState('transcribing');
      try {
        const body = new FormData();
        const ext = blob.type.includes('mp4') ? 'recording.mp4' : 'recording.webm';
        body.append('audio', blob, ext);

        const response = await fetch('/api/speech/transcribe', {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
          body,
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          const message =
            response.status === 503
              ? 'Voice transcription is not set up. Add OPENAI_API_KEY to your root .env, run fill-env, and restart the dev server.'
              : response.status === 422 || response.status === 400
                ? (data.error ?? 'No speech detected. Speak for a few seconds, then tap Stop.')
                : (data.error ?? 'Transcription failed. Try again.');
          onErrorRef.current?.(message);
          resetIdle();
          return;
        }

        const data = await response.json();
        const text = typeof data.text === 'string' ? data.text.trim() : '';
        if (text) onTranscriptRef.current(text);
        else onErrorRef.current?.('No speech detected. Speak clearly for a few seconds, then tap Stop.');
      } catch {
        onErrorRef.current?.('Transcription failed. Check your connection.');
      } finally {
        resetIdle();
      }
    },
    [accessToken, resetIdle]
  );

  const startBrowser = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      onErrorRef.current?.('Voice input is not supported in this browser. Use Type instead.');
      return;
    }

    browserTranscriptRef.current = '';
    stoppingBrowserRef.current = false;
    networkRetriedRef.current = false;
    setInterimText('Listening… speak now');
    setState('listening');

    const recognition = new Ctor();
    recognition.lang = 'en-GB';
    recognition.interimResults = true;
    // Safari handles single-utterance mode more reliably than continuous.
    recognition.continuous = !isSafari();

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const combined = readTranscriptFromEvent(event);
      if (combined) {
        browserTranscriptRef.current = combined;
        setInterimText(combined);
        markSpeechActivity();
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (stoppingBrowserRef.current && IGNORED_WHILE_STOPPING.has(event.error)) {
        return;
      }
      if (browserTranscriptRef.current.trim()) {
        return;
      }

      if (event.error === 'network' && !networkRetriedRef.current) {
        networkRetriedRef.current = true;
        try {
          recognition.start();
          return;
        } catch {
          /* fall through */
        }
      }

      if (event.error === 'network' && whisperAvailableRef.current && hasMediaRecorder()) {
        recognitionRef.current = null;
        resetIdle();
        setMode('whisper');
        startWhisperRef.current();
        return;
      }

      recognitionRef.current = null;
      resetIdle();
      const message = ERROR_MESSAGES[event.error] ?? 'Voice input failed. Try again.';
      onErrorRef.current?.(message);
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      if (stoppingBrowserRef.current) {
        deliverBrowserTranscript();
        return;
      }
      // Safari auto-ends after a pause — deliver if we captured speech.
      if (browserTranscriptRef.current.trim()) {
        deliverBrowserTranscript();
      } else {
        resetIdle();
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      startSilenceMonitor();
    } catch {
      recognitionRef.current = null;
      resetIdle();
      onErrorRef.current?.('Could not start voice input. Tap the mic again.');
    }
  }, [deliverBrowserTranscript, resetIdle, markSpeechActivity, startSilenceMonitor]);

  const startWhisper = useCallback(async () => {
    if (!accessToken) {
      onErrorRef.current?.('Your session expired. Please sign in again.');
      return;
    }

    if (!hasMediaRecorder()) {
      startBrowser();
      return;
    }

    setState('starting');
    setInterimText(micReady ? 'Listening…' : 'Allow microphone access…');

    try {
      const stream = await ensureMicStream();
      if (!stream) {
        resetIdle();
        onErrorRef.current?.('Microphone access denied. Allow mic permission in your browser settings.');
        return;
      }

      chunksRef.current = [];

      const mimeType = pickMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        recorderRef.current = null;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || 'audio/webm' });
        chunksRef.current = [];
        if (blob.size > 0) uploadRecording(blob);
        else {
          resetIdle();
          onErrorRef.current?.('No audio captured. Tap the mic, speak for a few seconds, then tap Stop.');
        }
      };

      recorder.onerror = () => {
        cleanupStream(true);
        resetIdle();
        onErrorRef.current?.('Recording failed. Try again.');
      };

      recorder.start(250);
      recordStartedAtRef.current = Date.now();
      hadSpeechRef.current = false;
      lastSpeechActivityRef.current = Date.now();
      startWhisperVad(stream);
      setState('recording');
      setInterimText('Listening…');

      recordTimerRef.current = setTimeout(() => {
        stopWhisper();
      }, MAX_RECORD_MS);
    } catch {
      cleanupStream(true);
      resetIdle();
      onErrorRef.current?.('Microphone access denied. Allow mic permission in your browser settings.');
    }
  }, [accessToken, cleanupStream, ensureMicStream, micReady, resetIdle, stopWhisper, uploadRecording, startWhisperVad]);

  useEffect(() => {
    startWhisperRef.current = () => {
      void startWhisper();
    };
  }, [startWhisper]);

  const start = useCallback(() => {
    if (!configLoaded) {
      onErrorRef.current?.('Voice is still starting up. Try again in a moment.');
      return;
    }

    if (whisperAvailable || mode === 'whisper') {
      void startWhisper();
      return;
    }

    // Browser STT needs Google's servers and often fails in embedded browsers.
    if (getSpeechRecognition() && !hasMediaRecorder()) {
      startBrowser();
      return;
    }

    onErrorRef.current?.(
      'Voice needs server transcription. Add OPENAI_API_KEY to your root .env, run `npm run fill-env -- ceevie`, restart the dev server, then tap the mic again.'
    );
  }, [configLoaded, mode, whisperAvailable, startWhisper, startBrowser]);

  const toggle = useCallback(() => {
    const busy = state !== 'idle';
    if (busy) stop();
    else start();
  }, [state, start, stop]);

  useEffect(
    () => () => {
      stoppingBrowserRef.current = false;
      try {
        recognitionRef.current?.stop();
      } catch {
        /* cleanup */
      }
      recognitionRef.current = null;
      stopWhisper();
      cleanupStream(true);
    },
    [stopWhisper, cleanupStream]
  );

  const active = state !== 'idle';

  return {
    supported,
    mode,
    whisperAvailable,
    configLoaded,
    micPermission,
    micReady,
    state,
    active,
    listening: state === 'listening' || state === 'recording' || state === 'starting',
    transcribing: state === 'transcribing',
    interimText,
    warmMic,
    toggle,
    stop,
  };
}
