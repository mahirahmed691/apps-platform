import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/apiAuth';

export async function GET(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await auth.db
    .from('cv_versions')
    .select('id, label, job_target, created_at, cover_letter')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: 'Failed to load versions' }, { status: 500 });
  return NextResponse.json({ versions: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const data = body as { label?: string; content?: string; coverLetter?: string; jobTarget?: string };
  if (!data.content?.trim() || !data.label?.trim()) {
    return NextResponse.json({ error: 'Missing label or content' }, { status: 400 });
  }

  const { data: row, error } = await auth.db
    .from('cv_versions')
    .insert({
      user_id: auth.user.id,
      label: data.label.trim().slice(0, 120),
      content: data.content.trim(),
      cover_letter: data.coverLetter?.trim() ?? '',
      job_target: data.jobTarget?.trim() ?? '',
    })
    .select('id, label, job_target, created_at, cover_letter')
    .single();

  if (error) return NextResponse.json({ error: 'Failed to save version' }, { status: 500 });
  return NextResponse.json({ version: row });
}
