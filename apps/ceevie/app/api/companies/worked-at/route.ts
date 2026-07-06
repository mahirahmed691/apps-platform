import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/apiAuth';

export async function GET(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await auth.db
    .from('company_worked_at')
    .select('company_id, role_title, created_at')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ workedAt: [] });

  return NextResponse.json({
    workedAt: (data ?? []).map((row) => ({
      companyId: String(row.company_id),
      roleTitle: typeof row.role_title === 'string' ? row.role_title : '',
      createdAt: typeof row.created_at === 'string' ? row.created_at : null,
    })),
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { companyId?: string; worked?: boolean; roleTitle?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const companyId = body.companyId?.trim();
  if (!companyId) return NextResponse.json({ error: 'Missing companyId' }, { status: 400 });

  if (body.worked === false) {
    const { error } = await auth.db
      .from('company_worked_at')
      .delete()
      .eq('user_id', auth.user.id)
      .eq('company_id', companyId);

    if (error) return NextResponse.json({ error: 'Failed to remove work history' }, { status: 500 });
    return NextResponse.json({ ok: true, companyId, worked: false });
  }

  const { error } = await auth.db.from('company_worked_at').upsert(
    {
      user_id: auth.user.id,
      company_id: companyId,
      role_title: body.roleTitle?.trim() ?? '',
      created_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,company_id' }
  );

  if (error) return NextResponse.json({ error: 'Failed to save work history' }, { status: 500 });
  return NextResponse.json({ ok: true, companyId, worked: true });
}
