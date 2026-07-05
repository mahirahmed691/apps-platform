import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@yourorg/app-core';
import { isBriefExpired, publicBriefFromRow } from '@/lib/roleBrief';

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const { token } = await context.params;
  if (!token?.trim()) return NextResponse.json({ error: 'Invalid invite' }, { status: 400 });

  const db = createSupabaseServer(url, serviceRoleKey);
  const { data, error } = await db
    .from('role_briefs')
    .select('id, title, company, description, requirements, status, expires_at')
    .eq('invite_token', token.trim())
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'Failed to load invite' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });

  const brief = publicBriefFromRow(data);
  if (brief.status !== 'active') {
    return NextResponse.json({ error: 'This invite is no longer active' }, { status: 410 });
  }
  if (isBriefExpired(brief.expiresAt)) {
    return NextResponse.json({ error: 'This invite has expired' }, { status: 410 });
  }

  return NextResponse.json({ brief });
}
