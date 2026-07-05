import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  GenerationDisabledError,
  RateLimitError,
  logUsageEvent,
} from '@yourorg/app-core';
import { requireAuthUser } from '@/lib/apiAuth';
import {
  EMPTY_ANSWERS,
  type AiChatResponse,
  type ChatMessage,
  type CvAnswers,
  buildChatPrompt,
  parseAiChatResponse,
} from '@/lib/cvBuilder';

const AI_TIMEOUT_MS = 20_000;
const FEATURE_NAME = 'cv_chat';

async function checkChatAllowed(db: SupabaseClient, userId: string) {
  const { data: config } = await db
    .from('app_config')
    .select('value')
    .eq('key', 'ai_generation_enabled')
    .single();

  if (config?.value === false || config?.value === 'false') {
    throw new GenerationDisabledError();
  }

  const { data: limitConfig } = await db
    .from('app_config')
    .select('value')
    .eq('key', 'cv_chat_daily_requests')
    .single();

  const dailyLimit = Number(limitConfig?.value ?? 12);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count, error } = await db
    .from('usage_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('feature', FEATURE_NAME)
    .gte('created_at', todayStart.toISOString());

  if (error) throw new Error('Failed to check chat limit');
  if ((count ?? 0) >= dailyLimit) {
    throw new RateLimitError(`Daily conversation limit of ${dailyLimit} reached. Try again tomorrow.`);
  }
}

function mergeAnswers(current: CvAnswers, updates?: Partial<CvAnswers>): CvAnswers {
  if (!updates) return current;
  const merged = { ...current };
  for (const key of Object.keys(EMPTY_ANSWERS) as (keyof CvAnswers)[]) {
    const value = updates[key];
    if (typeof value === 'string' && value.trim()) {
      merged[key] = merged[key].trim()
        ? `${merged[key].trim()}\n${value.trim()}`
        : value.trim();
    }
  }
  return merged;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const auth = await requireAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: {
    messages?: ChatMessage[];
    answers?: CvAnswers;
    userMessage?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const messages = body.messages;
  const answers = body.answers;
  const userMessage = body.userMessage?.trim();

  if (!Array.isArray(messages) || !answers || typeof answers !== 'object') {
    return NextResponse.json({ error: 'Missing messages or answers' }, { status: 400 });
  }

  try {
    await checkChatAllowed(auth.db, auth.user.id);
  } catch (err) {
    if (err instanceof GenerationDisabledError) {
      return NextResponse.json({ error: 'Temporarily unavailable, try again shortly.' }, { status: 503 });
    }
    if (err instanceof RateLimitError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    throw err;
  }

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
        max_tokens: 768,
        messages: [{ role: 'user', content: buildChatPrompt(messages, answers, userMessage) }],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      await logUsageEvent(auth.db, {
        userId: auth.user.id,
        feature: FEATURE_NAME,
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: Date.now() - startTime,
        status: 'error',
        errorDetail: `HTTP ${response.status}: ${errText}`,
      });
      return NextResponse.json({ error: 'Could not get a follow-up question. Try again.' }, { status: 502 });
    }

    const data = await response.json();
    const rawText = data.content?.find((c: { type: string }) => c.type === 'text')?.text ?? '';

    let parsed: AiChatResponse;
    try {
      parsed = parseAiChatResponse(rawText);
    } catch {
      await logUsageEvent(auth.db, {
        userId: auth.user.id,
        feature: FEATURE_NAME,
        inputTokens: data.usage?.input_tokens ?? 0,
        outputTokens: data.usage?.output_tokens ?? 0,
        latencyMs: Date.now() - startTime,
        status: 'error',
        errorDetail: 'Invalid JSON from model',
      });
      return NextResponse.json({ error: 'Could not parse AI response. Try again.' }, { status: 502 });
    }

    await logUsageEvent(auth.db, {
      userId: auth.user.id,
      feature: FEATURE_NAME,
      inputTokens: data.usage?.input_tokens ?? 0,
      outputTokens: data.usage?.output_tokens ?? 0,
      latencyMs: Date.now() - startTime,
      status: 'success',
    });

    return NextResponse.json({
      ...parsed,
      answers: mergeAnswers(answers, parsed.fieldUpdates),
    });
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    await logUsageEvent(auth.db, {
      userId: auth.user.id,
      feature: FEATURE_NAME,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: Date.now() - startTime,
      status: isTimeout ? 'timeout' : 'error',
      errorDetail: String(err),
    });
    return NextResponse.json(
      { error: isTimeout ? 'Request timed out, please retry.' : 'Something went wrong.' },
      { status: isTimeout ? 504 : 500 }
    );
  }
}
