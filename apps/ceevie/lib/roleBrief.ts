import { randomBytes } from 'crypto';
import { getSiteUrl } from '@/lib/site';

export type RoleBriefStatus = 'draft' | 'active' | 'closed';
export type RedemptionStatus = 'started' | 'completed' | 'approved';

export type RoleBrief = {
  id: string;
  recruiterId: string;
  title: string;
  company: string;
  description: string;
  requirements: string;
  inviteToken: string;
  status: RoleBriefStatus;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InviteRedemption = {
  id: string;
  briefId: string;
  candidateUserId: string;
  status: RedemptionStatus;
  recruiterNotes: string;
  redeemedAt: string;
  completedAt: string | null;
  approvedAt: string | null;
  candidateEmail?: string | null;
  candidateName?: string | null;
  generatedCv?: string | null;
};

export type PublicRoleBrief = Pick<
  RoleBrief,
  'id' | 'title' | 'company' | 'description' | 'requirements' | 'status' | 'expiresAt'
>;

export function generateInviteToken(): string {
  return randomBytes(18).toString('base64url');
}

export function buildInviteUrl(token: string): string {
  return `${getSiteUrl()}/i/${token}`;
}

export function buildJobDescriptionFromBrief(brief: Pick<RoleBrief, 'title' | 'company' | 'description' | 'requirements'>): string {
  const lines = [
    brief.title.trim(),
    brief.company.trim() ? `Company: ${brief.company.trim()}` : '',
    '',
    brief.description.trim(),
    brief.requirements.trim() ? `\nRequirements:\n${brief.requirements.trim()}` : '',
  ].filter((line, index) => line !== '' || index === 2);

  return lines.join('\n').trim();
}

export function buildTargetRoleFromBrief(brief: Pick<RoleBrief, 'title' | 'company'>): string {
  const title = brief.title.trim();
  const company = brief.company.trim();
  if (title && company) return `${title} at ${company}`;
  return title || company;
}

export function isBriefExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

export function briefRowToRoleBrief(row: Record<string, unknown>): RoleBrief {
  return {
    id: String(row.id),
    recruiterId: String(row.recruiter_id),
    title: typeof row.title === 'string' ? row.title : '',
    company: typeof row.company === 'string' ? row.company : '',
    description: typeof row.description === 'string' ? row.description : '',
    requirements: typeof row.requirements === 'string' ? row.requirements : '',
    inviteToken: typeof row.invite_token === 'string' ? row.invite_token : '',
    status: (row.status as RoleBriefStatus) ?? 'active',
    expiresAt: typeof row.expires_at === 'string' ? row.expires_at : null,
    createdAt: typeof row.created_at === 'string' ? row.created_at : new Date().toISOString(),
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : new Date().toISOString(),
  };
}

export function redemptionRowToInviteRedemption(row: Record<string, unknown>): InviteRedemption {
  const profile = row.profiles as Record<string, unknown> | null | undefined;

  return {
    id: String(row.id),
    briefId: String(row.brief_id),
    candidateUserId: String(row.candidate_user_id),
    status: (row.status as RedemptionStatus) ?? 'started',
    recruiterNotes: typeof row.recruiter_notes === 'string' ? row.recruiter_notes : '',
    redeemedAt: typeof row.redeemed_at === 'string' ? row.redeemed_at : new Date().toISOString(),
    completedAt: typeof row.completed_at === 'string' ? row.completed_at : null,
    approvedAt: typeof row.approved_at === 'string' ? row.approved_at : null,
    candidateEmail: typeof profile?.email === 'string' ? profile.email : null,
    candidateName: typeof profile?.full_name === 'string' ? profile.full_name : null,
  };
}

export function publicBriefFromRow(row: Record<string, unknown>): PublicRoleBrief {
  const brief = briefRowToRoleBrief(row);
  return {
    id: brief.id,
    title: brief.title,
    company: brief.company,
    description: brief.description,
    requirements: brief.requirements,
    status: brief.status,
    expiresAt: brief.expiresAt,
  };
}
