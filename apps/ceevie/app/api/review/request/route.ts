import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/apiAuth';
import { sendOptionalEmail } from '@/lib/notify';

export async function POST(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const content = typeof (body as { content?: string }).content === 'string' ? (body as { content: string }).content.trim() : '';
  if (!content) return NextResponse.json({ error: 'Missing content' }, { status: 400 });

  const { data, error } = await auth.db
    .from('cv_review_requests')
    .insert({ user_id: auth.user.id, content, status: 'pending' })
    .select('id, status, created_at')
    .single();

  if (error) return NextResponse.json({ error: 'Failed to create review request' }, { status: 500 });

  const reviewEmail = process.env.CEEVIE_REVIEW_EMAIL;
  if (reviewEmail) {
    await sendOptionalEmail({
      to: reviewEmail,
      subject: 'New Ceevie human review request',
      text: `User ${auth.user.email ?? auth.user.id} requested a CV review.\n\n${content.slice(0, 4000)}`,
    });
  }

  return NextResponse.json({ request: data });
}
