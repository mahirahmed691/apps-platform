import { createSupabaseServer } from '@yourorg/app-core';
import { NextRequest, NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  if (!token) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const db = createSupabaseServer(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data, error } = await db
    .from('cv_shares')
    .select('content, label, expires_at, created_at')
    .eq('token', token)
    .maybeSingle();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'Expired' }, { status: 410 });
  }

  return NextResponse.json({ share: data });
}
