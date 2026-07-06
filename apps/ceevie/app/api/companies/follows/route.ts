import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/apiAuth';

export async function GET(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await auth.db
    .from('company_follows')
    .select('company_id, created_at')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ follows: [] });

  return NextResponse.json({
    follows: (data ?? []).map((row) => ({
      companyId: String(row.company_id),
      createdAt: typeof row.created_at === 'string' ? row.created_at : null,
    })),
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { companyId?: string; follow?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const companyId = body.companyId?.trim();
  if (!companyId) return NextResponse.json({ error: 'Missing companyId' }, { status: 400 });

  if (body.follow === false) {
    const { error } = await auth.db
      .from('company_follows')
      .delete()
      .eq('user_id', auth.user.id)
      .eq('company_id', companyId);

    if (error) return NextResponse.json({ error: 'Failed to unfollow company' }, { status: 500 });
    return NextResponse.json({ ok: true, companyId, following: false });
  }

  const { error } = await auth.db.from('company_follows').upsert(
    {
      user_id: auth.user.id,
      company_id: companyId,
      created_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,company_id' }
  );

  if (error) return NextResponse.json({ error: 'Failed to follow company' }, { status: 500 });
  return NextResponse.json({ ok: true, companyId, following: true });
}
