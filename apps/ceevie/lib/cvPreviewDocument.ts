import { ANSWER_LABELS, type CvAnswers } from '@/lib/cvBuilder';
import { parseRecentRoleFields } from '@/lib/cvRecentRoleFields';

export type PreviewSectionKey = keyof CvAnswers | 'summary';

export type CvPreviewSection = {
  key: PreviewSectionKey;
  label: string;
  value: string;
  sourceKey?: keyof CvAnswers;
  generated: boolean;
};

export type CvPreviewDocument = {
  fullName: string;
  targetRole: string;
  recentRole: string;
  sections: CvPreviewSection[];
};

export const CV_PREVIEW_SECTION_ORDER: PreviewSectionKey[] = [
  'summary',
  'achievements',
  'experience',
  'skills',
  'education',
];

export const CV_SIDEBAR_COLUMN_SECTIONS: PreviewSectionKey[] = ['skills', 'education'];
export const CV_SIDEBAR_MAIN_SECTIONS: PreviewSectionKey[] = ['summary', 'achievements', 'experience'];

const DOC_SECTION_LABELS: Partial<Record<PreviewSectionKey, string>> = {
  summary: 'Professional summary',
  achievements: 'Key achievements',
  experience: 'Experience',
  skills: 'Skills',
  education: 'Education',
};

const SKILL_KEYWORDS = [
  'AWS',
  'Azure',
  'GCP',
  'Docker',
  'Kubernetes',
  'Terraform',
  'GitHub Actions',
  'CI/CD',
  'Python',
  'TypeScript',
  'JavaScript',
  'React',
  'Next.js',
  'Node.js',
  'SQL',
  'PostgreSQL',
  'Figma',
  'Agile',
  'Stakeholder management',
  'Leadership',
  'Mentoring',
];

export function buildCvPreviewDocument(
  answers: CvAnswers,
  previewEdits: Partial<Record<PreviewSectionKey, string>> = {}
): CvPreviewDocument {
  const recent = parseRecentRole(answers.recentRole);
  const document = {
    fullName: cleanText(answers.fullName),
    targetRole: cleanText(answers.targetRole),
    recentRole: cleanText(answers.recentRole),
    sections: buildLivePreviewSections(answers, recent),
  };

  if (Object.keys(previewEdits).length === 0) return document;

  return {
    ...document,
    sections: document.sections.map((section) => {
      const override = previewEdits[section.key]?.trim();
      if (!override) return section;
      return {
        ...section,
        value: override,
        generated: false,
      };
    }),
  };
}

function buildLivePreviewSections(answers: CvAnswers, recent: ParsedRecentRole): CvPreviewSection[] {
  const summary = buildSummary(answers, recent);
  const achievements = buildAchievements(answers, recent);
  const experience = buildExperience(answers, recent);
  const skills = buildSkills(answers);
  const education = cleanText(answers.education);

  return [
    {
      key: 'summary',
      label: DOC_SECTION_LABELS.summary ?? 'Professional summary',
      value: summary,
      generated: true,
    },
    {
      key: 'achievements',
      label: DOC_SECTION_LABELS.achievements ?? ANSWER_LABELS.achievements,
      value: achievements.value,
      sourceKey: achievements.sourceKey,
      generated: achievements.generated,
    },
    {
      key: 'experience',
      label: DOC_SECTION_LABELS.experience ?? ANSWER_LABELS.experience,
      value: experience.value,
      sourceKey: experience.sourceKey,
      generated: experience.generated,
    },
    {
      key: 'skills',
      label: DOC_SECTION_LABELS.skills ?? ANSWER_LABELS.skills,
      value: skills.value,
      sourceKey: skills.sourceKey,
      generated: skills.generated,
    },
    {
      key: 'education',
      label: DOC_SECTION_LABELS.education ?? ANSWER_LABELS.education,
      value: education,
      sourceKey: 'education',
      generated: false,
    },
  ];
}

function buildSummary(answers: CvAnswers, recent: ParsedRecentRole): string {
  const targetRole = cleanText(answers.targetRole);
  const skills = cleanText(answers.skills);
  const duties = recent.duties || recent.raw;
  const role = recent.title || targetRole;

  if (!targetRole && !role && !duties && !skills) return '';

  const parts: string[] = [];
  if (role || targetRole) {
    parts.push(`${role || targetRole} profile${recent.company ? ` with experience at ${recent.company}` : ''}`);
  }
  if (duties) parts.push(`focused on ${lowerFirst(duties)}`);
  if (skills) parts.push(`bringing skills across ${lowerFirst(skills)}`);
  if (targetRole && role !== targetRole) parts.push(`targeting ${lowerFirst(targetRole)} opportunities`);

  return ensureSentence(parts.join(', '));
}

function buildAchievements(
  answers: CvAnswers,
  recent: ParsedRecentRole
): { value: string; sourceKey?: keyof CvAnswers; generated: boolean } {
  const achievements = cleanText(answers.achievements);
  if (achievements) return { value: ensureSentence(achievements), sourceKey: 'achievements', generated: false };

  if (!recent.duties && !recent.raw) return { value: '', generated: true };
  return {
    value: ensureSentence(`Contributed practical delivery experience across ${lowerFirst(recent.duties || recent.raw)}`),
    sourceKey: 'recentRole',
    generated: true,
  };
}

function buildExperience(
  answers: CvAnswers,
  recent: ParsedRecentRole
): { value: string; sourceKey?: keyof CvAnswers; generated: boolean } {
  const experience = cleanText(answers.experience);
  if (experience) return { value: ensureSentence(experience), sourceKey: 'experience', generated: false };

  const duties = recent.duties || recent.raw;
  if (!duties && !recent.title && !recent.company) return { value: '', generated: true };

  const roleLine = [recent.title, recent.company ? `at ${recent.company}` : '', recent.dates ? `(${recent.dates})` : '']
    .filter(Boolean)
    .join(' ');
  return {
    value: ensureSentence(`${roleLine || 'Recent role'} centred on ${lowerFirst(duties || recent.raw)}`),
    sourceKey: 'recentRole',
    generated: true,
  };
}

function buildSkills(answers: CvAnswers): { value: string; sourceKey?: keyof CvAnswers; generated: boolean } {
  const explicitSkills = cleanText(answers.skills);
  if (explicitSkills) return { value: explicitSkills, sourceKey: 'skills', generated: false };

  const inferred = inferSkills([answers.recentRole, answers.achievements, answers.experience, answers.targetRole].join(' '));
  return {
    value: inferred.join(', '),
    sourceKey: inferred.length ? 'recentRole' : undefined,
    generated: true,
  };
}

type ParsedRecentRole = {
  raw: string;
  company: string;
  title: string;
  dates: string;
  duties: string;
};

function parseRecentRole(value: string): ParsedRecentRole {
  const raw = cleanText(value);
  if (!raw) return { raw: '', company: '', title: '', dates: '', duties: '' };

  const fields = parseRecentRoleFields(raw);
  if (fields.title || fields.company || fields.dates || fields.duties) {
    return { raw, ...fields };
  }

  return { raw, company: '', title: '', dates: '', duties: raw };
}

function inferSkills(text: string): string[] {
  const normalized = text.toLowerCase();
  return SKILL_KEYWORDS.filter((skill) => normalized.includes(skill.toLowerCase())).slice(0, 8);
}

function cleanText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function ensureSentence(value: string): string {
  const trimmed = cleanText(value);
  if (!trimmed) return '';
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function lowerFirst(value: string): string {
  const trimmed = cleanText(value);
  if (!trimmed) return '';
  return `${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`;
}
