import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/apiAuth';

export async function GET(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await auth.db
    .from('cv_exports')
    .select('id, export_type, label, created_at')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) return NextResponse.json({ error: 'Failed to load export history' }, { status: 500 });
  return NextResponse.json({ exports: data ?? [] });
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

  const data = body as { exportType?: string; label?: string; content?: string };
  if (!data.content?.trim() || !data.exportType) {
    return NextResponse.json({ error: 'Missing export payload' }, { status: 400 });
  }

  const { error } = await auth.db.from('cv_exports').insert({
    user_id: auth.user.id,
    export_type: data.exportType,
    label: data.label?.trim().slice(0, 120) ?? 'Export',
    content: data.content.trim(),
  });

  if (error) return NextResponse.json({ error: 'Failed to log export' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
