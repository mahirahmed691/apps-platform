import type { CvAnswers } from '@/lib/cvBuilder';

import type { CvTemplateId } from '@/lib/cvTemplateLibrary';

export type PdfTemplate = CvTemplateId;

export type AtsScoreResult = {
  score: number;
  summary: string;
  missingKeywords: string[];
  suggestions: string[];
};

export const COACH_TIPS: Record<string, string> = {
  fullName: 'Use the name you want recruiters to see on the document.',
  targetRole: 'Mention seniority, industry, and location if it matters.',
  recentRole: 'Include company, title, dates, and what you actually did day to day.',
  achievements: 'Lead with outcomes: numbers, revenue, time saved, people led.',
  experience: 'Earlier roles can be shorter — keep the story coherent.',
  skills: 'Mix tools, methods, and domains. Mirror language from the job if you have one.',
  education: 'Degrees, certifications, and relevant coursework all count.',
  extras: 'Languages, volunteering, side projects — only if they strengthen the story.',
  jobDescription: 'Paste the posting or a link summary so we can mirror keywords.',
};

export function getCoachTip(sectionId: keyof CvAnswers): string {
  return COACH_TIPS[sectionId] ?? 'Speak naturally — we will shape it into CV-ready language.';
}

export function orderSectionsForRole(targetRole: string): (keyof CvAnswers)[] {
  const role = targetRole.toLowerCase();
  const technical = /engineer|developer|software|data|devops|architect|technical/.test(role);
  const leadership = /director|head|lead|manager|chief|vp|principal/.test(role);

  if (technical) {
    return ['fullName', 'targetRole', 'skills', 'recentRole', 'achievements', 'experience', 'education', 'extras', 'jobDescription'];
  }
  if (leadership) {
    return ['fullName', 'targetRole', 'recentRole', 'achievements', 'experience', 'skills', 'education', 'extras', 'jobDescription'];
  }
  return ['fullName', 'targetRole', 'recentRole', 'achievements', 'experience', 'skills', 'education', 'extras', 'jobDescription'];
}

export function buildCoverLetterPrompt(cv: string, answers: CvAnswers, language = 'en'): string {
  return `Write a concise, professional cover letter in ${language} based on this CV and interview context.
Do not invent facts. Use a warm, confident tone. Max 350 words.

Target role: ${answers.targetRole}
Job context: ${answers.jobDescription || 'General application'}

CV:
${cv}`;
}

export function buildPolishPrompt(cv: string): string {
  return `Improve this CV text: sharper bullet points, stronger verbs, no new facts. Return only the revised CV.

${cv}`;
}

export function buildAtsPrompt(cv: string, jobDescription: string): string {
  return `Analyze this CV against the job description. Respond with JSON only:
{"score":0-100,"summary":"...","missingKeywords":["..."],"suggestions":["..."]}

Job:
${jobDescription}

CV:
${cv}`;
}

export function buildJobExtractPrompt(input: string): string {
  return `Extract a job posting summary from this input (URL or pasted text). Respond with JSON only:
{"title":"...","company":"...","description":"...","requirements":"..."}

Input:
${input.slice(0, 12000)}`;
}

export function buildImportInterviewPrompt(rawCv: string): string {
  return `This is an existing CV. List follow-up interview questions (JSON array of strings) to refresh weak or missing sections. Max 6 questions.

${rawCv.slice(0, 8000)}`;
}

export function parseJsonLoose<T>(text: string): T | null {
  try {
    const start = text.indexOf('{');
    const arrayStart = text.indexOf('[');
    const useArray = arrayStart >= 0 && (start < 0 || arrayStart < start);
    if (useArray) {
      const end = text.lastIndexOf(']');
      if (end < arrayStart) return null;
      return JSON.parse(text.slice(arrayStart, end + 1)) as T;
    }
    const end = text.lastIndexOf('}');
    if (start < 0 || end < start) return null;
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

export function simpleLineDiff(before: string, after: string): string[] {
  const left = before.split('\n');
  const right = after.split('\n');
  const max = Math.max(left.length, right.length);
  const lines: string[] = [];

  for (let i = 0; i < max; i += 1) {
    const a = left[i] ?? '';
    const b = right[i] ?? '';
    if (a === b) {
      if (a) lines.push(`  ${a}`);
    } else {
      if (a) lines.push(`- ${a}`);
      if (b) lines.push(`+ ${b}`);
    }
  }

  return lines;
}
