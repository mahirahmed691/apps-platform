import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/apiAuth';
import { deleteUserAccount } from '@/lib/deleteUserAccount';

export async function DELETE(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await deleteUserAccount(auth.db, auth.user.id);
  if (!result.ok) {
    console.error('[account/delete]', auth.user.id, result.error);
    return NextResponse.json({ error: 'Could not delete your account. Please try again or contact support.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
