import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/apiAuth';
import { requireRecruiter } from '@/lib/recruiterAuth';
import {
  briefRowToRoleBrief,
  buildInviteUrl,
  generateInviteToken,
  type RoleBriefStatus,
} from '@/lib/roleBrief';

type BriefSummary = {
  id: string;
  title: string;
  company: string;
  status: RoleBriefStatus;
  inviteUrl: string;
  redemptionCount: number;
  completedCount: number;
  approvedCount: number;
  createdAt: string;
  updatedAt: string;
};

function parseCreateBody(body: unknown): { title: string; company: string; description: string; requirements: string } | null {
  if (!body || typeof body !== 'object') return null;
  const data = body as Record<string, unknown>;
  if (typeof data.title !== 'string' || !data.title.trim()) return null;
  return {
    title: data.title.trim(),
    company: typeof data.company === 'string' ? data.company.trim() : '',
    description: typeof data.description === 'string' ? data.description.trim() : '',
    requirements: typeof data.requirements === 'string' ? data.requirements.trim() : '',
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const recruiter = await requireRecruiter(auth.db, auth.user);
  if (!recruiter.ok) return NextResponse.json({ error: recruiter.message }, { status: recruiter.status });

  const { data: briefs, error } = await auth.db
    .from('role_briefs')
    .select('id, title, company, status, invite_token, created_at, updated_at')
    .eq('recruiter_id', auth.user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: 'Failed to load briefs' }, { status: 500 });

  const briefIds = (briefs ?? []).map((b) => b.id);
  const redemptionCounts = new Map<string, { total: number; completed: number; approved: number }>();

  if (briefIds.length > 0) {
    const { data: redemptions, error: redemptionError } = await auth.db
      .from('invite_redemptions')
      .select('brief_id, status')
      .in('brief_id', briefIds);

    if (redemptionError) return NextResponse.json({ error: 'Failed to load brief stats' }, { status: 500 });

    for (const row of redemptions ?? []) {
      const current = redemptionCounts.get(row.brief_id) ?? { total: 0, completed: 0, approved: 0 };
      current.total += 1;
      if (row.status === 'completed' || row.status === 'approved') current.completed += 1;
      if (row.status === 'approved') current.approved += 1;
      redemptionCounts.set(row.brief_id, current);
    }
  }

  const summaries: BriefSummary[] = (briefs ?? []).map((row) => {
    const stats = redemptionCounts.get(row.id) ?? { total: 0, completed: 0, approved: 0 };
    return {
      id: row.id,
      title: row.title,
      company: row.company ?? '',
      status: row.status,
      inviteUrl: buildInviteUrl(row.invite_token),
      redemptionCount: stats.total,
      completedCount: stats.completed,
      approvedCount: stats.approved,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });

  return NextResponse.json({ briefs: summaries });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const recruiter = await requireRecruiter(auth.db, auth.user);
  if (!recruiter.ok) return NextResponse.json({ error: recruiter.message }, { status: recruiter.status });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = parseCreateBody(body);
  if (!parsed) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

  const inviteToken = generateInviteToken();
  const now = new Date().toISOString();

  const { data, error } = await auth.db
    .from('role_briefs')
    .insert({
      recruiter_id: auth.user.id,
      title: parsed.title,
      company: parsed.company,
      description: parsed.description,
      requirements: parsed.requirements,
      invite_token: inviteToken,
      status: 'active',
      updated_at: now,
    })
    .select('*')
    .single();

  if (error || !data) return NextResponse.json({ error: 'Failed to create brief' }, { status: 500 });

  const brief = briefRowToRoleBrief(data);

  return NextResponse.json({
    brief: {
      ...brief,
      inviteUrl: buildInviteUrl(brief.inviteToken),
    },
  });
}
