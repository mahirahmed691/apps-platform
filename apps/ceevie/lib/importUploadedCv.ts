import { EMPTY_ANSWERS, countFilledSections, isReadyToGenerate, type CvAnswers } from '@/lib/cvBuilder';
import type { PreviewSectionKey } from '@/lib/cvPreviewDocument';
import { parseGeneratedCvDocument, serializeCvPreviewDocument } from '@/lib/parseGeneratedCv';
import { normalizeUserProfile, type UserProfile } from '@/lib/userProfile';

export type ImportUploadResult = {
  answers: CvAnswers;
  previewEdits: Partial<Record<PreviewSectionKey, string>>;
  generatedCv: string;
  finished: boolean;
};

export function importUploadedCvText(text: string, profile?: UserProfile | null): ImportUploadResult {
  const safe = normalizeUserProfile(profile);
  const doc = parseGeneratedCvDocument(text.trim(), {
    fullName: safe.fullName,
    targetRole: safe.headline,
  });

  const answers: CvAnswers = { ...EMPTY_ANSWERS };
  if (doc.fullName.trim()) answers.fullName = doc.fullName.trim();
  if (doc.targetRole.trim()) answers.targetRole = doc.targetRole.trim();
  if (doc.recentRole.trim()) answers.recentRole = doc.recentRole.trim();

  const previewEdits: Partial<Record<PreviewSectionKey, string>> = {};

  for (const section of doc.sections) {
    if (section.key === 'summary') {
      previewEdits.summary = section.value;
      continue;
    }
    if (
      section.key === 'achievements' ||
      section.key === 'experience' ||
      section.key === 'skills' ||
      section.key === 'education' ||
      section.key === 'extras'
    ) {
      answers[section.key] = section.value;
    }
  }

  const generatedCv = serializeCvPreviewDocument(doc);
  const filled = countFilledSections(answers);
  const finished = isReadyToGenerate(answers) || filled >= 4 || Boolean(generatedCv.trim());

  return { answers, previewEdits, generatedCv, finished };
}
