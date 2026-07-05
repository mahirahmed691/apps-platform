import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/apiAuth';
import { requireRecruiter } from '@/lib/recruiterAuth';
import {
  briefRowToRoleBrief,
  buildInviteUrl,
  redemptionRowToInviteRedemption,
  type RedemptionStatus,
  type RoleBriefStatus,
} from '@/lib/roleBrief';

type RouteContext = { params: Promise<{ id: string }> };

function parseBriefUpdate(body: unknown): {
  status?: RoleBriefStatus;
  brandName?: string;
  logoUrl?: string;
  accentColor?: string;
  welcomeMessage?: string;
} | null {
  if (!body || typeof body !== 'object') return null;
  const data = body as Record<string, unknown>;
  const update: {
    status?: RoleBriefStatus;
    brandName?: string;
    logoUrl?: string;
    accentColor?: string;
    welcomeMessage?: string;
  } = {};

  if (data.status === 'draft' || data.status === 'active' || data.status === 'closed') {
    update.status = data.status;
  } else if (data.status !== undefined) {
    return null;
  }

  if (typeof data.brandName === 'string') update.brandName = data.brandName.trim();
  if (typeof data.logoUrl === 'string') update.logoUrl = data.logoUrl.trim();
  if (typeof data.accentColor === 'string') update.accentColor = data.accentColor.trim();
  if (typeof data.welcomeMessage === 'string') update.welcomeMessage = data.welcomeMessage.trim();

  return update;
}

function parseRedemptionUpdate(body: unknown): {
  redemptionId: string;
  status?: RedemptionStatus;
  recruiterNotes?: string;
  pipelineStage?: string;
  rejectionReason?: string;
} | null {
  if (!body || typeof body !== 'object') return null;
  const data = body as Record<string, unknown>;
  if (typeof data.redemptionId !== 'string' || !data.redemptionId) return null;

  const status =
    data.status === 'approved' ||
    data.status === 'completed' ||
    data.status === 'started' ||
    data.status === 'rejected'
      ? data.status
      : undefined;

  return {
    redemptionId: data.redemptionId,
    status,
    recruiterNotes: typeof data.recruiterNotes === 'string' ? data.recruiterNotes.trim() : undefined,
    pipelineStage: typeof data.pipelineStage === 'string' ? data.pipelineStage.trim() : undefined,
    rejectionReason: typeof data.rejectionReason === 'string' ? data.rejectionReason.trim() : undefined,
  };
}

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await requireAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const recruiter = await requireRecruiter(auth.db, auth.user);
  if (!recruiter.ok) return NextResponse.json({ error: recruiter.message }, { status: recruiter.status });

  const { id } = await context.params;

  const { data: briefRow, error } = await auth.db
    .from('role_briefs')
    .select('*')
    .eq('id', id)
    .eq('recruiter_id', auth.user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'Failed to load brief' }, { status: 500 });
  if (!briefRow) return NextResponse.json({ error: 'Brief not found' }, { status: 404 });

  const { data: redemptionRows, error: redemptionError } = await auth.db
    .from('invite_redemptions')
    .select('*, profiles(email, full_name)')
    .eq('brief_id', id)
    .order('redeemed_at', { ascending: false });

  if (redemptionError) return NextResponse.json({ error: 'Failed to load candidates' }, { status: 500 });

  const brief = briefRowToRoleBrief(briefRow);
  const redemptions = (redemptionRows ?? []).map(redemptionRowToInviteRedemption);
  const candidateIds = redemptions.map((redemption) => redemption.candidateUserId);
  const generatedCvByUser = new Map<string, string>();

  if (candidateIds.length > 0) {
    const { data: draftRows } = await auth.db
      .from('cv_drafts')
      .select('user_id, generated_cv')
      .eq('active_brief_id', id)
      .in('user_id', candidateIds);

    for (const row of draftRows ?? []) {
      const generatedCv = typeof row.generated_cv === 'string' ? row.generated_cv.trim() : '';
      if (generatedCv) generatedCvByUser.set(String(row.user_id), generatedCv);
    }
  }

  return NextResponse.json({
    brief: {
      ...brief,
      inviteUrl: buildInviteUrl(brief.inviteToken),
    },
    redemptions: redemptions.map((redemption) => ({
      ...redemption,
      generatedCv: generatedCvByUser.get(redemption.candidateUserId) ?? null,
    })),
  });
}

export async function PATCH(req: NextRequest, context: RouteContext) {
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

  const redemptionUpdate = parseRedemptionUpdate(body);
  if (redemptionUpdate) {
    const patch: Record<string, unknown> = {};
    if (redemptionUpdate.status) patch.status = redemptionUpdate.status;
    if (redemptionUpdate.recruiterNotes !== undefined) patch.recruiter_notes = redemptionUpdate.recruiterNotes;
    if (redemptionUpdate.pipelineStage !== undefined) patch.pipeline_stage = redemptionUpdate.pipelineStage;
    if (redemptionUpdate.rejectionReason !== undefined) patch.rejection_reason = redemptionUpdate.rejectionReason;
    if (redemptionUpdate.status === 'approved') patch.approved_at = new Date().toISOString();
    if (redemptionUpdate.status === 'rejected') patch.rejected_at = new Date().toISOString();

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const { data, error } = await auth.db
      .from('invite_redemptions')
      .update(patch)
      .eq('id', redemptionUpdate.redemptionId)
      .eq('brief_id', id)
      .select('*, profiles(email, full_name)')
      .maybeSingle();

    if (error) return NextResponse.json({ error: 'Failed to update candidate' }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Candidate not found for this brief' }, { status: 404 });

    return NextResponse.json({ redemption: redemptionRowToInviteRedemption(data) });
  }

  const briefUpdate = parseBriefUpdate(body);
  if (briefUpdate === null) return NextResponse.json({ error: 'Invalid update payload' }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (briefUpdate.status) patch.status = briefUpdate.status;
  if (briefUpdate.brandName !== undefined) patch.brand_name = briefUpdate.brandName;
  if (briefUpdate.logoUrl !== undefined) patch.logo_url = briefUpdate.logoUrl;
  if (briefUpdate.accentColor !== undefined) patch.accent_color = briefUpdate.accentColor;
  if (briefUpdate.welcomeMessage !== undefined) patch.welcome_message = briefUpdate.welcomeMessage;

  if (Object.keys(patch).length === 1) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

  const { data, error } = await auth.db
    .from('role_briefs')
    .update(patch)
    .eq('id', id)
    .eq('recruiter_id', auth.user.id)
    .select('*')
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'Failed to update brief' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Brief not found' }, { status: 404 });

  const brief = briefRowToRoleBrief(data);
  return NextResponse.json({ brief: { ...brief, inviteUrl: buildInviteUrl(brief.inviteToken) } });
}
