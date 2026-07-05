import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/apiAuth';

export async function GET(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await auth.db
    .from('profiles')
    .select('referral_code, bonus_generations')
    .eq('id', auth.user.id)
    .maybeSingle();

  let code = data?.referral_code;
  if (!code) {
    code = randomBytes(5).toString('hex');
    await auth.db.from('profiles').update({ referral_code: code }).eq('id', auth.user.id);
  }

  return NextResponse.json({
    referralCode: code,
    bonusGenerations: data?.bonus_generations ?? 0,
    shareUrl: `${req.nextUrl.origin}/login?ref=${code}`,
  });
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

  const code = typeof (body as { code?: string }).code === 'string' ? (body as { code: string }).code.trim() : '';
  if (!code) return NextResponse.json({ error: 'Missing referral code' }, { status: 400 });

  const { data: referrer } = await auth.db.from('profiles').select('id').eq('referral_code', code).maybeSingle();
  if (!referrer || referrer.id === auth.user.id) {
    return NextResponse.json({ error: 'Invalid referral code' }, { status: 400 });
  }

  const { data: profile } = await auth.db
    .from('profiles')
    .select('referred_by')
    .eq('id', auth.user.id)
    .maybeSingle();

  if (profile?.referred_by) return NextResponse.json({ ok: true, alreadyApplied: true });

  await auth.db.from('profiles').update({ referred_by: referrer.id }).eq('id', auth.user.id);

  await auth.db
    .from('profiles')
    .update({ bonus_generations: 2 })
    .eq('id', auth.user.id);

  await auth.db
    .from('profiles')
    .update({ bonus_generations: 2 })
    .eq('id', referrer.id);

  return NextResponse.json({ ok: true });
}
