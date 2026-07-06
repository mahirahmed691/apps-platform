import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/apiAuth';

export async function POST(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const completedAt = new Date().toISOString();
  const { data, error } = await auth.db
    .from('profiles')
    .update({ studio_setup_completed_at: completedAt })
    .eq('id', auth.user.id)
    .select('studio_setup_completed_at')
    .single();

  if (error) return NextResponse.json({ error: 'Failed to complete setup' }, { status: 500 });

  return NextResponse.json({
    studioSetupCompletedAt: data.studio_setup_completed_at ?? completedAt,
  });
}
