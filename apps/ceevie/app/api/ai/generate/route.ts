import { NextRequest, NextResponse } from 'next/server';
import {
  createSupabaseServer,
  checkAndIncrement,
  RateLimitError,
  GenerationDisabledError,
  logUsageEvent,
} from '@yourorg/app-core';

// This is the ONLY file you should need to touch per-feature.
// Everything else (rate limiting, kill switch, cost tracking) comes
// from @yourorg/app-core and is fixed once, for every app, in one place.

const AI_TIMEOUT_MS = 30_000;
const FEATURE_NAME = '__FEATURE_NAME__'; // rename per feature

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createSupabaseServer(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const token = authHeader.replace('Bearer ', '');
  const { data: userData, error: authError } = await db.auth.getUser(token);
  if (authError || !userData.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = userData.user.id;
  const { data: profile } = await db.from('profiles').select('plan').eq('id', userId).single();

  try {
    await checkAndIncrement(db, userId, profile?.plan ?? 'free');
  } catch (err) {
    if (err instanceof GenerationDisabledError) {
      return NextResponse.json({ error: 'Temporarily unavailable, try again shortly.' }, { status: 503 });
    }
    if (err instanceof RateLimitError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    throw err;
  }

  const { prompt } = await req.json();
  if (!prompt || typeof prompt !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid prompt' }, { status: 400 });
  }

  // === Your feature-specific prompt logic goes here ===
  const finalPrompt = prompt; // wrap/template this per feature

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: finalPrompt }],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      await logUsageEvent(db, {
        userId, feature: FEATURE_NAME, inputTokens: 0, outputTokens: 0,
        latencyMs: Date.now() - startTime, status: 'error', errorDetail: `HTTP ${response.status}: ${errText}`,
      });
      return NextResponse.json({ error: 'Generation failed, please retry.' }, { status: 502 });
    }

    const data = await response.json();
    const textContent = data.content?.find((c: any) => c.type === 'text')?.text ?? '';

    await logUsageEvent(db, {
      userId, feature: FEATURE_NAME,
      inputTokens: data.usage?.input_tokens ?? 0,
      outputTokens: data.usage?.output_tokens ?? 0,
      latencyMs: Date.now() - startTime, status: 'success',
    });

    return NextResponse.json({ result: textContent });
  } catch (err: any) {
    clearTimeout(timeoutId);
    const isTimeout = err.name === 'AbortError';
    await logUsageEvent(db, {
      userId, feature: FEATURE_NAME, inputTokens: 0, outputTokens: 0,
      latencyMs: Date.now() - startTime, status: isTimeout ? 'timeout' : 'error', errorDetail: String(err),
    });
    return NextResponse.json(
      { error: isTimeout ? 'Request timed out, please retry.' : 'Something went wrong.' },
      { status: isTimeout ? 504 : 500 }
    );
  }
}
