import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/apiAuth';
import { getSiteUrl } from '@/lib/site';

export async function GET(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await auth.db
    .from('cv_shares')
    .select('id, token, label, expires_at, created_at')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) return NextResponse.json({ error: 'Failed to load shares' }, { status: 500 });
  return NextResponse.json({
    shares: (data ?? []).map((row) => ({
      ...row,
      url: `${getSiteUrl()}/s/${row.token}`,
    })),
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

  const data = body as { content?: string; label?: string; expiresInDays?: number };
  if (!data.content?.trim()) return NextResponse.json({ error: 'Missing content' }, { status: 400 });

  const token = randomBytes(16).toString('base64url');
  const expiresAt =
    typeof data.expiresInDays === 'number' && data.expiresInDays > 0
      ? new Date(Date.now() + data.expiresInDays * 86400000).toISOString()
      : null;

  const { data: row, error } = await auth.db
    .from('cv_shares')
    .insert({
      user_id: auth.user.id,
      token,
      content: data.content.trim(),
      label: data.label?.trim().slice(0, 120) ?? 'Shared CV',
      expires_at: expiresAt,
    })
    .select('token, label, expires_at, created_at')
    .single();

  if (error) return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 });

  return NextResponse.json({
    share: {
      ...row,
      url: `${getSiteUrl()}/s/${row.token}`,
    },
  });
}
