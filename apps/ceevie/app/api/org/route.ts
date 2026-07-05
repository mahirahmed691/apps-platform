import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/apiAuth';

export async function GET(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await auth.db
    .from('profiles')
    .select('org_id, recruiter_plan')
    .eq('id', auth.user.id)
    .maybeSingle();

  if (!profile?.org_id) return NextResponse.json({ org: null });

  const { data: org } = await auth.db.from('organizations').select('*').eq('id', profile.org_id).maybeSingle();
  const { data: members } = await auth.db
    .from('org_members')
    .select('user_id, role, profiles(full_name, email)')
    .eq('org_id', profile.org_id);

  return NextResponse.json({ org, members: members ?? [], recruiterPlan: profile.recruiter_plan });
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

  const data = body as { name?: string; orgType?: 'team' | 'agency' | 'university'; seatLimit?: number };
  if (!data.name?.trim()) return NextResponse.json({ error: 'Missing organization name' }, { status: 400 });

  const { data: org, error } = await auth.db
    .from('organizations')
    .insert({
      name: data.name.trim(),
      org_type: data.orgType ?? 'team',
      seat_limit: data.seatLimit ?? 5,
      owner_id: auth.user.id,
      billing_plan: data.orgType === 'university' ? 'university' : 'team',
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 });

  await auth.db.from('org_members').insert({ org_id: org.id, user_id: auth.user.id, role: 'owner' });
  await auth.db.from('profiles').update({ org_id: org.id, recruiter_plan: 'team' }).eq('id', auth.user.id);

  return NextResponse.json({ org });
}
