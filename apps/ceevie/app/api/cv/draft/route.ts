import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/apiAuth';
import type { ChatMessage, CvAnswers } from '@/lib/cvBuilder';

export type CvDraftPayload = {
  answers: CvAnswers;
  messages: ChatMessage[];
  finished: boolean;
  turnCount: number;
  generatedCv?: string | null;
};

function isCvAnswers(value: unknown): value is CvAnswers {
  if (!value || typeof value !== 'object') return false;
  const keys = ['fullName', 'targetRole', 'recentRole', 'achievements', 'experience', 'skills', 'education', 'extras', 'jobDescription'];
  return keys.every((k) => typeof (value as Record<string, unknown>)[k] === 'string');
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== 'object') return false;
  const msg = value as Record<string, unknown>;
  return typeof msg.id === 'string' && (msg.role === 'assistant' || msg.role === 'user') && typeof msg.content === 'string';
}

function parseDraftBody(body: unknown): CvDraftPayload | null {
  if (!body || typeof body !== 'object') return null;
  const data = body as Record<string, unknown>;
  if (!isCvAnswers(data.answers)) return null;
  if (!Array.isArray(data.messages) || !data.messages.every(isChatMessage)) return null;
  if (typeof data.finished !== 'boolean') return null;
  if (typeof data.turnCount !== 'number' || data.turnCount < 0) return null;
  const generatedCv =
    data.generatedCv === null || data.generatedCv === undefined
      ? null
      : typeof data.generatedCv === 'string'
        ? data.generatedCv
        : null;
  return {
    answers: data.answers,
    messages: data.messages,
    finished: data.finished,
    turnCount: data.turnCount,
    generatedCv,
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await auth.db
    .from('cv_drafts')
    .select('answers, messages, finished, turn_count, generated_cv, updated_at')
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'Failed to load draft' }, { status: 500 });
  if (!data) return NextResponse.json({ draft: null });

  return NextResponse.json({
    draft: {
      answers: data.answers,
      messages: data.messages,
      finished: data.finished,
      turnCount: data.turn_count,
      generatedCv: data.generated_cv ?? null,
      updatedAt: data.updated_at,
    },
  });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const draft = parseDraftBody(body);
  if (!draft) return NextResponse.json({ error: 'Invalid draft payload' }, { status: 400 });

  const { error } = await auth.db.from('cv_drafts').upsert(
    {
      user_id: auth.user.id,
      answers: draft.answers,
      messages: draft.messages,
      finished: draft.finished,
      turn_count: draft.turnCount,
      generated_cv: draft.generatedCv ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await auth.db.from('cv_drafts').delete().eq('user_id', auth.user.id);
  if (error) return NextResponse.json({ error: 'Failed to delete draft' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
