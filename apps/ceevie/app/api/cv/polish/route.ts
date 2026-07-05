import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/apiAuth';
import { runAnthropicPrompt } from '@/lib/aiClient';
import { buildPolishPrompt } from '@/lib/studioFeatures';

export async function POST(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const cv = typeof (body as { cv?: string }).cv === 'string' ? (body as { cv: string }).cv.trim() : '';
  if (!cv) return NextResponse.json({ error: 'Missing cv' }, { status: 400 });

  try {
    const result = await runAnthropicPrompt(buildPolishPrompt(cv));
    return NextResponse.json({ cv: result.trim() });
  } catch {
    return NextResponse.json({ error: 'Polish failed' }, { status: 502 });
  }
}
