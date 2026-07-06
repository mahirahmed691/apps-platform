'use client';

type AccountIntent = 'candidate' | 'recruiter';

type IconName =
  | 'mic'
  | 'profile'
  | 'preview'
  | 'export'
  | 'upload'
  | 'edit'
  | 'style'
  | 'tailor'
  | 'autosave'
  | 'recruiter';

function FeatureIcon({ name }: { name: IconName }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  switch (name) {
    case 'mic':
      return (
        <svg {...common}>
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
        </svg>
      );
    case 'profile':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20a7 7 0 0 1 14 0" />
        </svg>
      );
    case 'preview':
      return (
        <svg {...common}>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M8 8h8M8 12h8M8 16h4" />
        </svg>
      );
    case 'export':
      return (
        <svg {...common}>
          <path d="M12 3v11m0 0 4-4m-4 4-4-4" />
          <path d="M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" />
        </svg>
      );
    case 'upload':
      return (
        <svg {...common}>
          <path d="M12 4v10m0 0 3.5-3.5M12 14l-3.5-3.5M5 18h14" />
        </svg>
      );
    case 'edit':
      return (
        <svg {...common}>
          <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      );
    case 'style':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      );
    case 'tailor':
      return (
        <svg {...common}>
          <path d="M4 7h16M4 12h10M4 17h7" />
          <circle cx="18" cy="17" r="3" />
        </svg>
      );
    case 'autosave':
      return (
        <svg {...common}>
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
          <path d="M17 21v-8H7v8M7 3v5h8" />
        </svg>
      );
    case 'recruiter':
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    default:
      return null;
  }
}

const CANDIDATE_FEATURES: Array<{ icon: IconName; label: string; title: string; copy: string }> = [
  {
    icon: 'mic',
    label: 'Voice interview',
    title: 'Guided prompts, not a blank page',
    copy: 'Ceevie asks smart follow-ups and turns spoken answers into CV-ready sections.',
  },
  {
    icon: 'preview',
    label: 'Live preview',
    title: 'Watch the document take shape',
    copy: 'Each answer lands on the page instantly — see gaps before you export.',
  },
  {
    icon: 'upload',
    label: 'Upload or continue',
    title: 'Start your way',
    copy: 'Begin fresh, pick up a saved draft, or import an existing .txt / .md CV.',
  },
  {
    icon: 'edit',
    label: 'Inline editing',
    title: 'Fix anything on the page',
    copy: 'Edit titles, companies, dates, and bullets directly on the live document.',
  },
  {
    icon: 'profile',
    label: 'Profile memory',
    title: 'Your basics stay ready',
    copy: 'Name, contact, LinkedIn, and photo saved once for every future CV.',
  },
  {
    icon: 'style',
    label: 'CV styles',
    title: 'Layouts that feel professional',
    copy: 'Switch themes, density, and sidebar layouts — PDF export matches the preview.',
  },
  {
    icon: 'tailor',
    label: 'Job tailoring',
    title: 'Aim at the role you want',
    copy: 'Paste a job description, follow target companies, and get ATS-aware suggestions.',
  },
  {
    icon: 'export',
    label: 'Export',
    title: 'Polished PDF when you are done',
    copy: 'One tap to download a recruiter-friendly PDF that matches what you see.',
  },
];

const RECRUITER_FEATURES: Array<{ icon: IconName; label: string; title: string; copy: string }> = [
  {
    icon: 'recruiter',
    label: 'Role briefs',
    title: 'Describe the hire once',
    copy: 'Capture title, requirements, and culture — reuse across every invite.',
  },
  {
    icon: 'tailor',
    label: 'Tailored interviews',
    title: 'Candidates speak to your brief',
    copy: 'Invited candidates get interview prompts shaped around your role.',
  },
  {
    icon: 'preview',
    label: 'CV in context',
    title: 'Review finished CVs in one place',
    copy: 'See generated CVs alongside the brief when candidates complete their story.',
  },
  {
    icon: 'export',
    label: 'Share & compare',
    title: 'Move faster on shortlists',
    copy: 'Copy CV text, compare candidates, and keep everything in the dashboard.',
  },
];

const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'Choose your start',
    copy: 'New interview, saved draft, or upload an existing CV.',
  },
  {
    step: '02',
    title: 'Speak naturally',
    copy: 'Answer guided questions by voice or keyboard — one section at a time.',
  },
  {
    step: '03',
    title: 'Review live',
    copy: 'Watch sections fill in, edit inline, and get quick improvement tips.',
  },
  {
    step: '04',
    title: 'Tailor & polish',
    copy: 'Match a job posting, refine wording, and pick a layout you like.',
  },
  {
    step: '05',
    title: 'Export',
    copy: 'Download a PDF, copy plain text, or regenerate with one click.',
  },
];

const STUDIO_TOOLS = [
  { title: 'ATS check', copy: 'Score your CV against a job description and spot missing keywords.' },
  { title: 'Cover letter', copy: 'Generate a matching letter from your CV — no invented facts.' },
  { title: 'Polish pass', copy: 'Sharpen bullets and verbs while keeping your story intact.' },
  { title: 'Company follow', copy: 'Follow companies you admire and tailor language to how they hire.' },
];

const TRUST_ITEMS = [
  { label: 'Autosave', value: 'Drafts sync as you work' },
  { label: 'Mobile', value: 'Phone mic or desktop — same studio' },
  { label: 'Privacy', value: 'Your CV stays in your account' },
  { label: 'LinkedIn', value: 'Optional import for basics only' },
];

type AuthFeatureShowcaseProps = {
  accountIntent?: AccountIntent;
};

export function AuthFeatureShowcase({ accountIntent = 'candidate' }: AuthFeatureShowcaseProps) {
  const features = accountIntent === 'recruiter' ? RECRUITER_FEATURES : CANDIDATE_FEATURES;
  const isRecruiter = accountIntent === 'recruiter';

  return (
    <div className="auth-showcase">
      <section className="auth-feature-section" aria-labelledby="auth-feature-title">
        <div className="auth-feature-header">
          <div className="auth-feature-heading">
            <p className="auth-feature-eyebrow">
              {isRecruiter ? 'For hiring teams' : 'Built for job applications'}
            </p>
            <h3 id="auth-feature-title">
              {isRecruiter
                ? 'Brief candidates once. Review polished CVs faster.'
                : 'Everything between your experience and a finished CV.'}
            </h3>
          </div>
        </div>

        <div className="auth-feature-grid auth-feature-grid-expanded">
          {features.map((feature) => (
            <article className="auth-feature-card" key={feature.label}>
              <span className="auth-feature-card-icon">
                <FeatureIcon name={feature.icon} />
              </span>
              <p>{feature.label}</p>
              <h4>{feature.title}</h4>
              <span className="auth-feature-card-copy">{feature.copy}</span>
            </article>
          ))}
        </div>
      </section>

      {!isRecruiter ? (
        <>
          <section className="auth-steps-section" aria-labelledby="auth-steps-title">
            <div className="auth-steps-header">
              <p className="auth-feature-eyebrow">How it works</p>
              <h3 id="auth-steps-title">From first word to export in five steps</h3>
            </div>
            <ol className="auth-steps-list">
              {WORKFLOW_STEPS.map((item) => (
                <li key={item.step} className="auth-steps-item">
                  <span className="auth-steps-index">{item.step}</span>
                  <div className="auth-steps-copy">
                    <strong>{item.title}</strong>
                    <span>{item.copy}</span>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="auth-toolkit-section" aria-labelledby="auth-toolkit-title">
            <div className="auth-toolkit-header">
              <p className="auth-feature-eyebrow">Studio toolkit</p>
              <h3 id="auth-toolkit-title">Go further after the interview</h3>
              <p className="auth-toolkit-lead">
                Built-in tools help you tailor, score, and polish — without leaving the studio.
              </p>
            </div>
            <div className="auth-toolkit-grid">
              {STUDIO_TOOLS.map((tool) => (
                <article key={tool.title} className="auth-toolkit-card">
                  <h4>{tool.title}</h4>
                  <p>{tool.copy}</p>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="auth-recruiter-section" aria-labelledby="auth-recruiter-title">
          <div className="auth-recruiter-copy">
            <p className="auth-feature-eyebrow">Recruiter workflow</p>
            <h3 id="auth-recruiter-title">Invite → interview → review</h3>
            <p>
              Send a role brief link, let Ceevie run a tailored voice interview, then review the
              candidate&apos;s generated CV from your dashboard — with copy and compare built in.
            </p>
          </div>
          <ul className="auth-recruiter-points">
            <li>Create a role brief with requirements and culture notes</li>
            <li>Share an invite link — candidates sign in and start tailored interviews</li>
            <li>Review completed CVs in context when they finish</li>
          </ul>
        </section>
      )}

      <section className="auth-trust-section" aria-label="Trust and platform details">
        <dl className="auth-trust-grid">
          {TRUST_ITEMS.map((item) => (
            <div key={item.label} className="auth-trust-item">
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
