import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/apiAuth';
import { runAnthropicPrompt } from '@/lib/aiClient';
import { buildAtsPrompt, parseJsonLoose, type AtsScoreResult } from '@/lib/studioFeatures';

export async function POST(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const data = body as { cv?: string; jobDescription?: string };
  if (!data.cv?.trim() || !data.jobDescription?.trim()) {
    return NextResponse.json({ error: 'Missing cv or jobDescription' }, { status: 400 });
  }

  try {
    const raw = await runAnthropicPrompt(buildAtsPrompt(data.cv, data.jobDescription), 1200);
    const parsed = parseJsonLoose<AtsScoreResult>(raw);
    if (!parsed || typeof parsed.score !== 'number') {
      return NextResponse.json({ error: 'Could not score CV' }, { status: 422 });
    }
    return NextResponse.json({ result: parsed });
  } catch {
    return NextResponse.json({ error: 'ATS scoring failed' }, { status: 502 });
  }
}
