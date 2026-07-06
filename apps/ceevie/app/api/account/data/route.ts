import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/apiAuth';

/** Clears saved CV data and profile fields without removing the sign-in account. */
export async function DELETE(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = auth.user.id;

  await auth.db.from('cv_versions').delete().eq('user_id', userId);
  await auth.db.from('cv_exports').delete().eq('user_id', userId);
  await auth.db.from('cv_shares').delete().eq('user_id', userId);
  await auth.db.from('cv_review_requests').delete().eq('user_id', userId);
  await auth.db.from('cv_drafts').delete().eq('user_id', userId);
  await auth.db.from('invite_redemptions').delete().eq('candidate_user_id', userId);

  await auth.db
    .from('profiles')
    .update({
      full_name: '',
      phone: '',
      location: '',
      linkedin_url: '',
      portfolio_url: '',
      headline: '',
      avatar_url: '',
      profile_updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await auth.db
    .from('profiles')
    .select('full_name, email, phone, location, linkedin_url, portfolio_url, headline, profile_updated_at')
    .eq('id', auth.user.id)
    .maybeSingle();

  return NextResponse.json({ export: data });
}
