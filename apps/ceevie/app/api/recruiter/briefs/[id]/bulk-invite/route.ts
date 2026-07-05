import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/apiAuth';
import { requireRecruiter } from '@/lib/recruiterAuth';
import { buildInviteUrl, generateInviteToken } from '@/lib/roleBrief';
import { sendOptionalEmail } from '@/lib/notify';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const auth = await requireAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const recruiter = await requireRecruiter(auth.db, auth.user);
  if (!recruiter.ok) return NextResponse.json({ error: recruiter.message }, { status: recruiter.status });

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const emails = Array.isArray((body as { emails?: string[] }).emails)
    ? (body as { emails: string[] }).emails.map((email) => email.trim().toLowerCase()).filter(Boolean)
    : [];

  if (emails.length === 0) return NextResponse.json({ error: 'Provide at least one email' }, { status: 400 });

  const { data: brief } = await auth.db
    .from('role_briefs')
    .select('id, title, invite_token')
    .eq('id', id)
    .eq('recruiter_id', auth.user.id)
    .maybeSingle();

  if (!brief) return NextResponse.json({ error: 'Brief not found' }, { status: 404 });

  const entries = [];
  for (const email of emails.slice(0, 50)) {
    const token = generateInviteToken();
    entries.push({
      brief_id: id,
      email,
      invite_token: token,
      status: 'sent',
    });

    await sendOptionalEmail({
      to: email,
      subject: `You're invited to build a CV for ${brief.title}`,
      text: `You have been invited to complete a tailored Ceevie interview.\n\nOpen: ${buildInviteUrl(token)}`,
    });
  }

  const { error } = await auth.db.from('bulk_invite_entries').insert(entries);
  if (error) return NextResponse.json({ error: 'Failed to save bulk invites' }, { status: 500 });

  return NextResponse.json({ sent: entries.length, invites: entries.map((entry) => ({ email: entry.email, url: buildInviteUrl(entry.invite_token) })) });
}
