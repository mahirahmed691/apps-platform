import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/apiAuth';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await requireAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await context.params;
  const { data, error } = await auth.db
    .from('cv_versions')
    .select('*')
    .eq('id', id)
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'Failed to load version' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ version: data });
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const auth = await requireAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await context.params;
  const { error } = await auth.db.from('cv_versions').delete().eq('id', id).eq('user_id', auth.user.id);
  if (error) return NextResponse.json({ error: 'Failed to delete version' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
