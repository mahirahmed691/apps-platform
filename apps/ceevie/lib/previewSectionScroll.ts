import type { PreviewSectionKey } from '@/lib/cvPreviewDocument';
import type { CvAnswers } from '@/lib/cvBuilder';

export type PreviewJumpTarget = PreviewSectionKey | 'header' | 'contact';

export function previewSectionId(target: PreviewJumpTarget): string {
  return `preview-section-${target}`;
}

export function answerKeyToJumpTarget(key: keyof CvAnswers): PreviewJumpTarget {
  if (key === 'fullName' || key === 'targetRole' || key === 'recentRole') return 'header';
  if (key === 'achievements' || key === 'experience' || key === 'skills' || key === 'education') return key;
  return 'header';
}

export function scrollToPreviewSection(target: PreviewJumpTarget): void {
  if (typeof document === 'undefined') return;
  const element = document.getElementById(previewSectionId(target));
  element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
