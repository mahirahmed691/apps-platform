import type { CvAnswers } from '@/lib/cvBuilder';
import type { PreviewSectionKey } from '@/lib/cvPreviewDocument';
import type { UserProfile } from '@/lib/userProfile';
import { normalizeUserProfile } from '@/lib/userProfile';

export type CvQualityTip = {
  id: string;
  label: string;
  detail: string;
  jumpTarget?: PreviewSectionKey | 'header' | 'contact';
};

const METRIC_PATTERN = /\d+%|\d+\s*(k|m|million|billion|£|\$|€)|\d{2,}/i;
const DATE_PATTERN =
  /\b(19|20)\d{2}\b|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}\b|\b\d{4}\s*[–—-]\s*(present|current|\d{4})\b/i;

export function getCvQualityTips(answers: CvAnswers, profile?: UserProfile | null): CvQualityTip[] {
  const tips: CvQualityTip[] = [];
  const safeProfile = normalizeUserProfile(profile);

  if (!safeProfile.email.trim() && !safeProfile.phone.trim()) {
    tips.push({
      id: 'contact',
      label: 'Add contact details',
      detail: 'Recruiters need a way to reach you — add email or phone on your CV.',
      jumpTarget: 'contact',
    });
  }

  if (!safeProfile.location.trim()) {
    tips.push({
      id: 'location',
      label: 'Add your location',
      detail: 'City or region helps recruiters know you are a practical fit.',
      jumpTarget: 'contact',
    });
  }

  if (answers.achievements.trim() && !METRIC_PATTERN.test(answers.achievements)) {
    tips.push({
      id: 'metrics',
      label: 'Add numbers to achievements',
      detail: 'Quantify impact — percentages, revenue, time saved, or team size stand out.',
      jumpTarget: 'achievements',
    });
  }

  const roleText = [answers.recentRole, answers.experience].filter(Boolean).join('\n');
  if (roleText.trim() && !DATE_PATTERN.test(roleText)) {
    tips.push({
      id: 'dates',
      label: 'Add dates to roles',
      detail: 'Include start/end dates or years so your timeline is clear.',
      jumpTarget: 'experience',
    });
  }

  if (answers.skills.trim()) {
    const skillCount = answers.skills.split(/[,;\n]/).filter((s) => s.trim()).length;
    if (skillCount < 4) {
      tips.push({
        id: 'skills',
        label: 'Expand your skills',
        detail: 'A few more relevant tools or strengths helps ATS and recruiters scan faster.',
        jumpTarget: 'skills',
      });
    }
  }

  if (!answers.experience.trim() && answers.recentRole.trim()) {
    tips.push({
      id: 'prior-roles',
      label: 'Add previous roles',
      detail: 'Earlier jobs add depth — even brief entries help for career changers.',
      jumpTarget: 'experience',
    });
  }

  return tips.slice(0, 4);
}
