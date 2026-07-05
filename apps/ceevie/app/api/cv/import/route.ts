import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/apiAuth';
import { runAnthropicPrompt } from '@/lib/aiClient';
import { buildImportInterviewPrompt, parseJsonLoose } from '@/lib/studioFeatures';

export async function POST(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const text = typeof (body as { text?: string }).text === 'string' ? (body as { text: string }).text.trim() : '';
  if (!text || text.length < 80) {
    return NextResponse.json({ error: 'Paste at least a few lines of CV text' }, { status: 400 });
  }

  try {
    const raw = await runAnthropicPrompt(buildImportInterviewPrompt(text), 1200);
    const questions = parseJsonLoose<string[]>(raw) ?? [];
    return NextResponse.json({ importedText: text.slice(0, 12000), questions });
  } catch {
    return NextResponse.json({ error: 'Import analysis failed' }, { status: 502 });
  }
}
