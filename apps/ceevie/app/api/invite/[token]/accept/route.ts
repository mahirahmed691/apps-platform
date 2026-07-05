import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/apiAuth';
import {
  buildJobDescriptionFromBrief,
  buildTargetRoleFromBrief,
  briefRowToRoleBrief,
  isBriefExpired,
  publicBriefFromRow,
} from '@/lib/roleBrief';
import { EMPTY_ANSWERS, type CvAnswers } from '@/lib/cvBuilder';

type RouteContext = { params: Promise<{ token: string }> };

function mergeBriefIntoAnswers(current: CvAnswers, brief: ReturnType<typeof briefRowToRoleBrief>): CvAnswers {
  const jobDescription = buildJobDescriptionFromBrief(brief);
  const targetRole = buildTargetRoleFromBrief(brief);

  return {
    ...current,
    targetRole: current.targetRole.trim() || targetRole,
    jobDescription: current.jobDescription.trim() ? current.jobDescription : jobDescription,
  };
}

export async function POST(req: NextRequest, context: RouteContext) {
  const auth = await requireAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { token } = await context.params;
  if (!token?.trim()) return NextResponse.json({ error: 'Invalid invite' }, { status: 400 });

  const { data: briefRow, error: briefError } = await auth.db
    .from('role_briefs')
    .select('*')
    .eq('invite_token', token.trim())
    .maybeSingle();

  if (briefError) return NextResponse.json({ error: 'Failed to load invite' }, { status: 500 });
  if (!briefRow) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });

  const brief = briefRowToRoleBrief(briefRow);
  if (brief.status !== 'active') {
    return NextResponse.json({ error: 'This invite is no longer active' }, { status: 410 });
  }
  if (isBriefExpired(brief.expiresAt)) {
    return NextResponse.json({ error: 'This invite has expired' }, { status: 410 });
  }

  const now = new Date().toISOString();

  const { error: redemptionError } = await auth.db.from('invite_redemptions').upsert(
    {
      brief_id: brief.id,
      candidate_user_id: auth.user.id,
      status: 'started',
      redeemed_at: now,
    },
    { onConflict: 'brief_id,candidate_user_id' }
  );

  if (redemptionError) return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 });

  const { data: existingDraft } = await auth.db
    .from('cv_drafts')
    .select('answers, messages, finished, turn_count, generated_cv')
    .eq('user_id', auth.user.id)
    .maybeSingle();

  const currentAnswers =
    existingDraft?.answers && typeof existingDraft.answers === 'object'
      ? ({ ...EMPTY_ANSWERS, ...(existingDraft.answers as CvAnswers) } as CvAnswers)
      : { ...EMPTY_ANSWERS };

  const mergedAnswers = mergeBriefIntoAnswers(currentAnswers, brief);

  const { error: draftError } = await auth.db.from('cv_drafts').upsert(
    {
      user_id: auth.user.id,
      answers: mergedAnswers,
      messages: existingDraft?.messages ?? [],
      finished: existingDraft?.finished ?? false,
      turn_count: existingDraft?.turn_count ?? 0,
      generated_cv: existingDraft?.generated_cv ?? null,
      active_brief_id: brief.id,
      updated_at: now,
    },
    { onConflict: 'user_id' }
  );

  if (draftError) return NextResponse.json({ error: 'Failed to apply role brief' }, { status: 500 });

  return NextResponse.json({
    ok: true,
    brief: publicBriefFromRow(briefRow),
    answers: mergedAnswers,
  });
}
