import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/apiAuth';
import { runAnthropicPrompt } from '@/lib/aiClient';
import { buildCoverLetterPrompt } from '@/lib/studioFeatures';
import type { CvAnswers } from '@/lib/cvBuilder';

export async function POST(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const data = body as { cv?: string; answers?: CvAnswers; language?: string; label?: string };
  if (!data.cv?.trim() || !data.answers) {
    return NextResponse.json({ error: 'Missing cv or answers' }, { status: 400 });
  }

  try {
    const result = await runAnthropicPrompt(
      buildCoverLetterPrompt(data.cv, data.answers, data.language ?? 'en')
    );

    await auth.db.from('cv_exports').insert({
      user_id: auth.user.id,
      export_type: 'cover_letter',
      label: data.label ?? 'Cover letter',
      content: result,
    });

    return NextResponse.json({ coverLetter: result });
  } catch {
    return NextResponse.json({ error: 'Cover letter generation failed' }, { status: 502 });
  }
}
