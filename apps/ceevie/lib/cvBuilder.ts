import { formatProfileContactBlock, getProfileFirstName, hasLinkedInImport, normalizeUserProfile, type UserProfile } from '@/lib/userProfile';
import { orderSectionsForRole } from '@/lib/studioFeatures';
import type { PreviewSectionKey } from '@/lib/cvPreviewDocument';

export type CompanyTailorContext = {
  name: string;
  tooling: string[];
  domains: string[];
  methodologies: string[];
  hiringSignals: string;
};

export type CvAnswers = {
  fullName: string;
  targetRole: string;
  recentRole: string;
  achievements: string;
  experience: string;
  skills: string;
  education: string;
  extras: string;
  jobDescription: string;
};

export type ConversationStep = {
  id: keyof CvAnswers;
  question: string;
  placeholder: string;
  optional?: boolean;
  hint?: string;
  /** Example phrases users can tap when voice is unclear or they need inspiration. */
  examples?: string[];
};

export const EMPTY_ANSWERS: CvAnswers = {
  fullName: '',
  targetRole: '',
  recentRole: '',
  achievements: '',
  experience: '',
  skills: '',
  education: '',
  extras: '',
  jobDescription: '',
};

export const ANSWER_LABELS: Record<keyof CvAnswers, string> = {
  fullName: 'Full name',
  targetRole: 'Target role',
  recentRole: 'Recent role',
  achievements: 'Achievements',
  experience: 'Experience',
  skills: 'Skills',
  education: 'Education',
  extras: 'Additional',
  jobDescription: 'Job to tailor for',
};

/** Core sections needed before generating a CV. */
export const REQUIRED_CV_SECTIONS: (keyof CvAnswers)[] = [
  'fullName',
  'targetRole',
  'recentRole',
  'achievements',
  'experience',
  'skills',
  'education',
];

export const CONVERSATION_STEPS: ConversationStep[] = [
  {
    id: 'fullName',
    question: "First things first — what's your name, as you'd like it on the CV?",
    placeholder: 'e.g. Sarah Ahmed',
    hint: 'First and last name is enough.',
    examples: ['Sarah Ahmed', "James O'Connor", 'Alex Morgan'],
  },
  {
    id: 'targetRole',
    question: "Let's start with the goal — what kind of role are you going for?",
    placeholder: 'e.g. Senior Product Manager in fintech, or first marketing role after uni',
    hint: 'A sentence is enough. This shapes the whole CV.',
    examples: [
      'Senior Product Manager in fintech',
      'Graduate software engineer, London',
      'Marketing manager, B2B SaaS',
    ],
  },
  {
    id: 'recentRole',
    question: 'Tell me about your current or most recent job — company, title, and what you actually do.',
    placeholder: 'I work at Acme as a Software Engineer. I build the checkout flow and lead our mobile app…',
    hint: 'Talk naturally. Dates and details help, but do not worry about formatting.',
    examples: [
      'Software Engineer at Monzo, building payments APIs',
      'Product Designer at a 40-person startup',
      'Operations Manager at Tesco, leading a team of 12',
    ],
  },
  {
    id: 'achievements',
    question: 'What are you most proud of in that role? Wins, numbers, impact — whatever stands out.',
    placeholder: 'Cut checkout drop-off by 18%, mentored two juniors, shipped the iOS app in 4 months…',
    hint: 'Metrics and outcomes make a CV memorable.',
    examples: [
      'Reduced churn by 15% through a new onboarding flow',
      'Led a migration that cut infra costs by £200k/year',
      'Mentored 3 juniors who all got promoted',
    ],
  },
  {
    id: 'experience',
    question: 'Any previous roles worth including? Walk me through them.',
    placeholder: 'Before that I was at Beta Ltd for 3 years as an analyst. I mainly…',
    hint: 'Skip anything irrelevant — we will trim later.',
    examples: [
      '2 years as Business Analyst at Deloitte',
      'Internship at Barclays, then junior role at a fintech',
      'Freelance consultant for 18 months before this role',
    ],
  },
  {
    id: 'skills',
    question: 'What skills, tools, or certifications should we highlight?',
    placeholder: 'Python, Figma, stakeholder management, PRINCE2, fluent French…',
    examples: [
      'Python, SQL, AWS, stakeholder management',
      'Figma, user research, A/B testing, Agile',
      'Excel, financial modelling, PRINCE2 certified',
    ],
  },
  {
    id: 'education',
    question: 'Education, training, or qualifications?',
    placeholder: 'BSc Computer Science, University of Manchester, 2019. AWS Solutions Architect cert…',
    examples: [
      'BSc Economics, University of Leeds, 2020',
      'MSc Data Science, Imperial College, 2022',
      'Self-taught developer, AWS Solutions Architect cert',
    ],
  },
  {
    id: 'extras',
    question: 'Anything else — languages, side projects, volunteering, awards?',
    placeholder: 'Open-source maintainer, volunteer mentor, fluent in Urdu…',
    optional: true,
  },
  {
    id: 'jobDescription',
    question: 'Got a specific job posting to tailor this to? Paste it here — or skip for a general CV.',
    placeholder: 'Paste the full job description, requirements, and responsibilities…',
    optional: true,
  },
];

export type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
};

export type AiChatResponse = {
  ready: boolean;
  nextQuestion: string | null;
  hint?: string;
  placeholder?: string;
  acknowledgment?: string;
  fieldUpdates?: Partial<CvAnswers>;
  /** Example phrases the user can tap when their answer was vague — not asserted facts. */
  suggestions?: string[];
};

export const MAX_SUGGESTIONS = 5;
export const MAX_SUGGESTION_LENGTH = 120;

export const WELCOME_MESSAGE =
  "Hi — I'm Ceevie. We'll build your CV together. Just talk naturally, like you're speaking to a recruiter.";

export const FIRST_QUESTION = CONVERSATION_STEPS[0].question;

export function getPrefilledAnswersFromProfile(profile?: Partial<UserProfile> | null): Partial<CvAnswers> {
  const safe = normalizeUserProfile(profile);
  const prefill: Partial<CvAnswers> = {};
  if (safe.fullName) prefill.fullName = safe.fullName;
  if (safe.headline) prefill.targetRole = safe.headline;
  return prefill;
}

export function mergePrefillFromProfile(current: CvAnswers, profile?: Partial<UserProfile> | null): CvAnswers {
  const prefill = getPrefilledAnswersFromProfile(profile);
  const next = { ...current };
  for (const key of Object.keys(prefill) as (keyof CvAnswers)[]) {
    const value = prefill[key];
    if (value?.trim() && !next[key].trim()) {
      next[key] = value.trim();
    }
  }
  return next;
}

export function buildWelcomeMessage(profile?: UserProfile | null): string {
  if (!profile) return WELCOME_MESSAGE;

  const firstName = getProfileFirstName(profile);
  if (hasLinkedInImport(profile) && firstName) {
    return `Hi ${firstName} — I've imported your LinkedIn basics. We'll focus on your experience and achievements — the parts LinkedIn doesn't capture.`;
  }

  if (firstName) {
    return `Hi ${firstName} — I'm Ceevie. We'll build your CV together. Just talk naturally, like you're speaking to a recruiter.`;
  }

  return WELCOME_MESSAGE;
}

export function buildInitialMessages(profile?: UserProfile | null): {
  messages: ChatMessage[];
  hint: string;
  placeholder: string;
} {
  const mergedAnswers = {
    ...EMPTY_ANSWERS,
    ...getPrefilledAnswersFromProfile(profile),
  };
  const step = getActiveConversationStep(mergedAnswers);

  return {
    messages: [
      { id: nextMessageId(), role: 'assistant', content: buildWelcomeMessage(profile) },
      { id: nextMessageId(), role: 'assistant', content: step.question },
    ],
    hint: step.hint ?? 'Talk naturally.',
    placeholder: step.placeholder,
  };
}

function createInitialMessages(profile?: UserProfile | null): ChatMessage[] {
  return buildInitialMessages(profile).messages;
}

export function nextMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function buildCvPrompt(
  answers: CvAnswers,
  profile?: UserProfile | null,
  language = 'en',
  followedCompanies?: CompanyTailorContext[],
  previewEdits: Partial<Record<PreviewSectionKey, string>> = {}
): string {
  const orderedKeys = orderSectionsForRole(answers.targetRole).filter(
    (key) => key !== 'jobDescription' && answers[key].trim()
  );
  const sections = orderedKeys
    .map((key) => `### ${ANSWER_LABELS[key]}\n${answers[key].trim()}`)
    .join('\n\n');

  const previewBlocks = (Object.keys(previewEdits) as PreviewSectionKey[])
    .filter((key) => previewEdits[key]?.trim())
    .map((key) => {
      const label =
        key === 'summary'
          ? 'Professional summary (edited in preview)'
          : key === 'achievements'
            ? 'Key achievements (edited in preview)'
            : `${ANSWER_LABELS[key as keyof CvAnswers] ?? key} (edited in preview)`;
      return `### ${label}\n${previewEdits[key]!.trim()}`;
    })
    .join('\n\n');

  const contactProfile = profile
    ? {
        ...profile,
        fullName: profile.fullName.trim() || answers.fullName.trim(),
      }
    : null;
  const contactBlock = contactProfile ? formatProfileContactBlock(contactProfile) : '';

  const tailorBlock = answers.jobDescription.trim()
    ? [
        '',
        '---',
        '',
        '### Job description to tailor for',
        answers.jobDescription.trim(),
        '',
        'Emphasise experience and skills that match this posting. Mirror relevant keywords naturally.',
      ].join('\n')
    : followedCompanies?.length
      ? [
          '',
          '---',
          '',
          '### Target employers to tailor for',
          ...followedCompanies.map((company) =>
            [
              `Company: ${company.name}`,
              `Priority tooling: ${company.tooling.slice(0, 8).join(', ')}`,
              `Priority domains: ${company.domains.join(', ')}`,
              `Ways of working: ${company.methodologies.join(', ')}`,
              `Hiring signals: ${company.hiringSignals}`,
            ].join('\n')
          ),
          '',
          'Emphasise overlapping skills and evidence that fit these employers across role families.',
        ].join('\n\n')
      : '';

  return [
    'You are an expert CV writer for UK job seekers.',
    'Turn the conversation notes below into a polished, professional CV.',
    '',
    'Rules:',
    '- Use only facts from the notes — never invent employers, dates, or achievements.',
    '- Write in clear British English with strong action verbs.',
    '- Structure: Name at top, Professional Summary, Experience (reverse chronological), Skills, Education, Additional (if relevant).',
    '- Use bullet points for achievements; quantify impact where the user provided numbers.',
    '- Keep it to 1–2 pages worth of content (roughly 400–700 words).',
    `- Write in ${language === 'en' ? 'clear British English' : language}.`,
    '- Output plain text only — no markdown headers with #, no commentary before or after the CV.',
    '',
    contactBlock ? '--- Contact details ---\n' + contactBlock + '\n' : '',
    '--- Conversation notes ---',
    '',
    sections,
    previewBlocks ? `\n\n${previewBlocks}` : '',
    tailorBlock,
  ].join('\n');
}

export function buildChatPrompt(
  messages: ChatMessage[],
  answers: CvAnswers,
  latestUserMessage?: string,
  profile?: UserProfile | null,
  roleBrief?: { title: string; company: string; description: string; requirements: string } | null,
  followedCompanies?: CompanyTailorContext[]
): string {
  const transcript = messages
    .map((m) => `${m.role === 'assistant' ? 'Interviewer' : 'Candidate'}: ${m.content}`)
    .join('\n');

  const captured = (Object.keys(ANSWER_LABELS) as (keyof CvAnswers)[])
    .filter((key) => answers[key].trim())
    .map((key) => `- ${ANSWER_LABELS[key]}: ${answers[key].trim()}`)
    .join('\n');

  const profileBlock = profile
    ? [
        '',
        '--- Profile already on file (do not re-ask for fields already captured below) ---',
        profile.fullName.trim() ? `Name: ${profile.fullName.trim()}` : '',
        profile.headline.trim() ? `Target role / headline: ${profile.headline.trim()}` : '',
        profile.location.trim() ? `Location: ${profile.location.trim()}` : '',
        profile.email.trim() ? `Email: ${profile.email.trim()}` : '',
        profile.linkedinUrl.trim() ? `LinkedIn: ${profile.linkedinUrl.trim()}` : '',
        hasLinkedInImport(profile)
          ? 'LinkedIn is connected — focus follow-ups on experience, achievements, skills, and education.'
          : 'If name or target role are listed above, skip those topics unless missing from Captured.',
      ]
        .filter(Boolean)
        .join('\n')
    : '';

  const roleBriefBlock = roleBrief
    ? [
        '',
        '--- Role brief from recruiter (tailor all questions and CV notes to this role) ---',
        roleBrief.title.trim() ? `Role: ${roleBrief.title.trim()}` : '',
        roleBrief.company.trim() ? `Company: ${roleBrief.company.trim()}` : '',
        roleBrief.description.trim() ? roleBrief.description.trim() : '',
        roleBrief.requirements.trim() ? `Requirements:\n${roleBrief.requirements.trim()}` : '',
        'Ask follow-ups that surface evidence relevant to this brief. Prefer concrete metrics and responsibilities that match the posting.',
      ]
        .filter(Boolean)
        .join('\n')
    : '';

  const followedCompaniesBlock = followedCompanies?.length
    ? [
        '',
        '--- Followed target companies (tailor interview notes and follow-ups to these employers) ---',
        ...followedCompanies.map((company) =>
          [
            `Company: ${company.name}`,
            `Priority tooling: ${company.tooling.slice(0, 8).join(', ')}`,
            `Priority domains: ${company.domains.join(', ')}`,
            `Ways of working: ${company.methodologies.join(', ')}`,
            `Hiring signals: ${company.hiringSignals}`,
          ].join('\n')
        ),
        'Ask follow-ups that surface evidence matching these stacks and domains. Query tooling, delivery methods, and domain experience when gaps remain.',
      ].join('\n\n')
    : '';

  return [
    'You are Ceevie, a warm UK CV coach interviewing a job seeker.',
    'After each candidate reply, extract structured notes and ask ONE natural follow-up question.',
    '',
    'Topics to cover before finishing (all required except extras and jobDescription):',
    '- fullName: name as it should appear on the CV',
    '- targetRole: role or industry they want',
    '- recentRole: current/most recent job (company, title, duties)',
    '- achievements: wins, metrics, impact',
    '- experience: previous roles',
    '- skills: tools, certifications, languages',
    '- education: degrees, training',
    '- extras (optional): side projects, volunteering',
    '- jobDescription (optional): specific job posting to tailor for',
    '',
    'Rules:',
    '- Ask ONE question at a time, conversational tone, no bullet lists in nextQuestion.',
    '- If their last answer covered multiple topics, update several fieldUpdates at once.',
    '- Append to fieldUpdates only new facts from the latest message — do not repeat entire history.',
    '- Set ready:true only when fullName, targetRole, recentRole, achievements, experience, skills, and education all have content.',
    '- When ready, nextQuestion should suggest they can build the CV; acknowledgment should briefly summarise what you captured.',
    '- If optional topics missing, you may still set ready:true — do not block on extras or jobDescription.',
    '- When the candidate\'s latest answer is vague, very short (under ~15 words), or missing concrete detail (no metrics, scope, or outcomes), include a "suggestions" array with 3–5 example phrases they could tap to replace or strengthen their answer.',
    '- Voice transcripts may be garbled — if the latest message looks unclear or incomplete, always return helpful suggestions even if you move to the next question.',
    '- Suggestions must be plausible for their stated role/industry but framed as prompts — never invent employers, dates, or achievements they did not imply. Use UK CV language. Empty array [] if their answer was already specific enough.',
    '- Respond with JSON only, no markdown fences.',
    '',
    'JSON shape:',
    '{"ready":boolean,"nextQuestion":string|null,"hint":string,"placeholder":string,"acknowledgment":string,"suggestions":["…"],"fieldUpdates":{"fullName":"","targetRole":"","recentRole":"","achievements":"","experience":"","skills":"","education":"","extras":"","jobDescription":""}}',
    profileBlock,
    roleBriefBlock,
    followedCompaniesBlock,
    '',
    '--- Captured so far ---',
    captured || '(nothing yet)',
    '',
    '--- Transcript ---',
    transcript,
    latestUserMessage ? `\nCandidate (latest): ${latestUserMessage}` : '',
  ].join('\n');
}

export function parseAiChatResponse(raw: string): AiChatResponse {
  const trimmed = raw.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON object in response');

  const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
  if (typeof parsed.ready !== 'boolean') throw new Error('Missing ready flag');

  const fieldUpdates: Partial<CvAnswers> = {};
  if (parsed.fieldUpdates && typeof parsed.fieldUpdates === 'object') {
    for (const key of Object.keys(EMPTY_ANSWERS) as (keyof CvAnswers)[]) {
      const val = (parsed.fieldUpdates as Record<string, unknown>)[key];
      if (typeof val === 'string' && val.trim()) fieldUpdates[key] = val.trim();
    }
  }

  return {
    ready: parsed.ready,
    nextQuestion: typeof parsed.nextQuestion === 'string' ? parsed.nextQuestion : null,
    hint: typeof parsed.hint === 'string' ? parsed.hint : undefined,
    placeholder: typeof parsed.placeholder === 'string' ? parsed.placeholder : undefined,
    acknowledgment: typeof parsed.acknowledgment === 'string' ? parsed.acknowledgment : undefined,
    fieldUpdates: Object.keys(fieldUpdates).length ? fieldUpdates : undefined,
    suggestions: parseSuggestions(parsed.suggestions),
  };
}

function parseSuggestions(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => (item.length > MAX_SUGGESTION_LENGTH ? `${item.slice(0, MAX_SUGGESTION_LENGTH - 1)}…` : item))
    .slice(0, MAX_SUGGESTIONS);
  return items.length ? items : undefined;
}

export function isReadyToGenerate(answers: CvAnswers): boolean {
  return REQUIRED_CV_SECTIONS.every((key) => answers[key].trim());
}

export function countFilledSections(answers: CvAnswers): number {
  return REQUIRED_CV_SECTIONS.filter((k) => answers[k].trim()).length;
}

export function buildAnswersDraftText(answers: CvAnswers): string {
  return REQUIRED_CV_SECTIONS.filter((key) => answers[key].trim())
    .map((key) => `${ANSWER_LABELS[key]}\n${answers[key].trim()}`)
    .join('\n\n');
}

export function getActiveConversationStep(answers: CvAnswers): ConversationStep {
  const prefilled = new Set<keyof CvAnswers>();
  if (answers.fullName.trim()) prefilled.add('fullName');
  if (answers.targetRole.trim()) prefilled.add('targetRole');

  for (const step of CONVERSATION_STEPS) {
    if (prefilled.has(step.id)) continue;
    if (!answers[step.id].trim()) return step;
  }
  return CONVERSATION_STEPS[CONVERSATION_STEPS.length - 1];
}

export function getStepExamples(answers: CvAnswers): string[] {
  return getActiveConversationStep(answers).examples ?? [];
}

const UNCLEAR_SINGLE_WORDS = new Set([
  'yes',
  'no',
  'ok',
  'okay',
  'sure',
  'maybe',
  'idk',
  'dunno',
  'nothing',
  'skip',
  'next',
]);

/** Heuristic: voice answer too short or vague to use as a CV note. */
export function isUnclearVoiceAnswer(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;

  const normalized = trimmed.toLowerCase().replace(/[^\w\s']/g, ' ').replace(/\s+/g, ' ').trim();
  const words = normalized.split(' ').filter(Boolean);

  if (words.length === 1 && UNCLEAR_SINGLE_WORDS.has(words[0])) return true;
  if (trimmed.length < 14 && words.length < 4) return true;
  if (words.length < 3) return true;

  return false;
}

export function mergeSuggestionLists(...lists: (string[] | undefined)[]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const list of lists) {
    if (!list) continue;
    for (const item of list) {
      const value = item.trim();
      if (!value || seen.has(value)) continue;
      seen.add(value);
      merged.push(value.length > MAX_SUGGESTION_LENGTH ? `${value.slice(0, MAX_SUGGESTION_LENGTH - 1)}…` : value);
      if (merged.length >= MAX_SUGGESTIONS) return merged;
    }
  }

  return merged;
}
