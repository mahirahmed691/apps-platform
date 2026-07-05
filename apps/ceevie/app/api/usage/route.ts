import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/apiAuth';

export async function GET(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await auth.db.from('profiles').select('plan').eq('id', auth.user.id).single();
  const plan = profile?.plan ?? 'free';

  const limitKey = plan === 'active' ? 'paid_tier_daily_requests' : 'free_tier_daily_requests';
  const { data: limitConfig } = await auth.db.from('app_config').select('value').eq('key', limitKey).single();
  const dailyLimit = Number(limitConfig?.value ?? 5);

  const today = new Date().toISOString().slice(0, 10);
  const { data: usage } = await auth.db
    .from('rate_limits')
    .select('request_count')
    .eq('user_id', auth.user.id)
    .eq('day', today)
    .maybeSingle();

  const used = usage?.request_count ?? 0;
  const remaining = Math.max(dailyLimit - used, 0);

  return NextResponse.json({
    plan,
    dailyLimit,
    used,
    remaining,
    canGenerate: remaining > 0,
  });
}
