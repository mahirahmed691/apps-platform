import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/apiAuth';
import { isDevToolsEnabledForEmail } from '@/lib/devAccess';

export async function POST(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!isDevToolsEnabledForEmail(auth.user.email)) {
    return NextResponse.json({ error: 'Not available' }, { status: 403 });
  }

  const { error: profileError } = await auth.db
    .from('profiles')
    .update({
      studio_setup_completed_at: null,
      full_name: '',
      headline: '',
      location: '',
      phone: '',
      profile_updated_at: new Date().toISOString(),
    })
    .eq('id', auth.user.id);

  if (profileError) {
    return NextResponse.json({ error: 'Failed to reset onboarding' }, { status: 500 });
  }

  // Clear the draft so GET backfill does not re-mark studio setup as complete.
  await auth.db.from('cv_drafts').delete().eq('user_id', auth.user.id);

  return NextResponse.json({ ok: true });
}
