import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/apiAuth';
import { simpleLineDiff } from '@/lib/studioFeatures';

export async function POST(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const data = body as { before?: string; after?: string };
  if (!data.before || !data.after) {
    return NextResponse.json({ error: 'Missing before/after text' }, { status: 400 });
  }

  return NextResponse.json({ diff: simpleLineDiff(data.before, data.after) });
}
