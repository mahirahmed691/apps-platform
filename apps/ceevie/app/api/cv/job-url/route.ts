import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/apiAuth';
import { runAnthropicPrompt } from '@/lib/aiClient';
import { buildJobExtractPrompt, parseJsonLoose } from '@/lib/studioFeatures';

export async function POST(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const input = typeof (body as { input?: string }).input === 'string' ? (body as { input: string }).input.trim() : '';
  if (!input) return NextResponse.json({ error: 'Missing input' }, { status: 400 });

  let enriched = input;
  if (/^https?:\/\//i.test(input)) {
    try {
      const response = await fetch(input, {
        headers: { 'User-Agent': 'CeevieBot/1.0' },
        signal: AbortSignal.timeout(8000),
      });
      if (response.ok) {
        const html = await response.text();
        enriched = `${input}\n\n${html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 8000)}`;
      }
    } catch {
      // fall back to URL-only extraction
    }
  }

  try {
    const raw = await runAnthropicPrompt(buildJobExtractPrompt(enriched), 1200);
    const parsed = parseJsonLoose<{ title?: string; company?: string; description?: string; requirements?: string }>(raw);
    if (!parsed?.title) return NextResponse.json({ error: 'Could not extract job details' }, { status: 422 });
    return NextResponse.json({ job: parsed });
  } catch {
    return NextResponse.json({ error: 'Job extraction failed' }, { status: 502 });
  }
}
