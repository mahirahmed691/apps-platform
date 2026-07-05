import { NextRequest, NextResponse } from 'next/server';
import { logUsageEvent } from '@yourorg/app-core';
import { requireAuthUser } from '@/lib/apiAuth';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const MIN_BYTES = 4_000; // ~0.25s — reject near-empty clips before Whisper hallucinates
const FEATURE_NAME = 'voice_transcribe';

/** Whisper can echo its style prompt when audio is silent or very short. */
function isLikelyPromptEcho(text: string): boolean {
  const normalized = text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!normalized) return true;

  const echoPhrases = [
    'job seeker describing',
    'describing work experience',
    'describing job experience',
    'roles skills and achievements for a cv',
    'roles skills and achievements',
    'british english cv interview',
  ];

  return echoPhrases.some((phrase) => normalized.includes(phrase));
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const auth = await requireAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return NextResponse.json({ error: 'Voice transcription is not configured.' }, { status: 503 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid upload' }, { status: 400 });
  }

  const audio = formData.get('audio');
  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json({ error: 'Missing audio' }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Recording too long. Try a shorter answer.' }, { status: 413 });
  }
  if (audio.size < MIN_BYTES) {
    return NextResponse.json({ error: 'Recording too short. Speak for a couple of seconds, then tap Stop.' }, { status: 400 });
  }

  const filename =
    audio.type.includes('mp4') || audio.type.includes('m4a')
      ? 'recording.m4a'
      : audio.type.includes('ogg')
        ? 'recording.ogg'
        : 'recording.webm';

  const upstream = new FormData();
  upstream.append('file', audio, filename);
  upstream.append('model', 'whisper-1');
  upstream.append('language', 'en');

  try {
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiKey}` },
      body: upstream,
    });

    if (!response.ok) {
      const detail = await response.text();
      await logUsageEvent(auth.db, {
        userId: auth.user.id,
        feature: FEATURE_NAME,
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: Date.now() - startTime,
        status: 'error',
        errorDetail: `HTTP ${response.status}: ${detail.slice(0, 200)}`,
      });
      return NextResponse.json({ error: 'Could not transcribe audio. Try again.' }, { status: 502 });
    }

    const data = (await response.json()) as { text?: string };
    const text = data.text?.trim() ?? '';

    if (!text || isLikelyPromptEcho(text)) {
      await logUsageEvent(auth.db, {
        userId: auth.user.id,
        feature: FEATURE_NAME,
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: Date.now() - startTime,
        status: 'error',
        errorDetail: 'empty_or_prompt_echo',
      });
      return NextResponse.json(
        { error: 'No speech detected. Speak clearly for a few seconds, then tap Stop.' },
        { status: 422 }
      );
    }

    await logUsageEvent(auth.db, {
      userId: auth.user.id,
      feature: FEATURE_NAME,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: Date.now() - startTime,
      status: 'success',
    });

    return NextResponse.json({ text });
  } catch (err) {
    await logUsageEvent(auth.db, {
      userId: auth.user.id,
      feature: FEATURE_NAME,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: Date.now() - startTime,
      status: 'error',
      errorDetail: String(err),
    });
    return NextResponse.json({ error: 'Transcription failed. Try again.' }, { status: 500 });
  }
}
