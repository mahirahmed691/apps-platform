import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/apiAuth';

export async function POST(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await auth.db
    .from('profiles')
    .update({ account_type: 'recruiter' })
    .eq('id', auth.user.id);

  if (error) return NextResponse.json({ error: 'Failed to activate recruiter account' }, { status: 500 });

  return NextResponse.json({ ok: true, accountType: 'recruiter' });
}
