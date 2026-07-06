import { countFilledSections, REQUIRED_CV_SECTIONS } from '@/lib/cvBuilder';
import type { DraftState } from '@/hooks/useCvDraft';

export type StudioDraftSummary = {
  filledSections: number;
  totalSections: number;
  targetRole?: string;
  fullName?: string;
  hasGeneratedCv: boolean;
  interviewTurns: number;
};

export function summarizeStudioDraft(draft: DraftState | null): StudioDraftSummary | null {
  if (!hasRecoverableDraft(draft) || !draft) return null;

  return {
    filledSections: countFilledSections(draft.answers),
    totalSections: REQUIRED_CV_SECTIONS.length,
    targetRole: draft.answers.targetRole.trim() || undefined,
    fullName: draft.answers.fullName.trim() || undefined,
    hasGeneratedCv: Boolean(draft.generatedCv?.trim()),
    interviewTurns: draft.turnCount,
  };
}

export function hasRecoverableDraft(draft: DraftState | null): boolean {
  if (!draft) return false;
  if (draft.messages.some((message) => message.role === 'user')) return true;
  if (draft.generatedCv?.trim()) return true;
  return countFilledSections(draft.answers) > 0;
}

export function draftProgressLabel(summary: StudioDraftSummary): string {
  if (summary.hasGeneratedCv) return 'Built CV ready to edit';
  if (summary.filledSections >= summary.totalSections) return 'Interview complete';
  if (summary.filledSections > 0) return `${summary.filledSections} of ${summary.totalSections} sections captured`;
  if (summary.interviewTurns > 0) return 'Interview in progress';
  return 'Draft saved';
}
