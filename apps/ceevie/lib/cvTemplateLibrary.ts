export const CV_TEMPLATE_IDS = [
  'classic',
  'modern',
  'compact',
  'executive',
  'minimal',
  'corporate',
  'banking',
  'legal',
  'consulting',
  'nonprofit',
  'studio',
  'editorial',
  'portfolio',
  'vibrant',
  'magazine',
  'engineer',
  'data',
  'startup',
  'cloud',
  'product',
  'scholar',
  'research',
  'teaching',
  'medical',
  'scientific',
  'impact',
  'statement',
  'accent',
  'europass',
  'international',
] as const;

export type CvTemplateId = (typeof CV_TEMPLATE_IDS)[number];

export type CvLayout = 'standard' | 'sidebar' | 'centered';

export type CvFontFamily = 'serif' | 'sans';

export type CvLabelStyle = 'uppercase' | 'sentence';

export type CvSectionDivider = 'none' | 'line' | 'accent-bar' | 'underline';

export type CvTemplateCategory = 'popular' | 'corporate' | 'creative' | 'technical' | 'academic' | 'statement';

export type CvThemeTokens = {
  layout: CvLayout;
  headingFont: CvFontFamily;
  bodyFont: CvFontFamily;
  headerColor: string;
  roleColor: string;
  accentColor: string;
  sectionLabelColor: string;
  bodyColor: string;
  paperBg: string;
  headerBorder: string;
  nameSize: string;
  nameWeight: string;
  roleSize: string;
  sectionLabelSize: string;
  sectionLabelTracking: string;
  bodySize: string;
  bodyLeading: string;
  sectionGap: string;
  headerPaddingBottom: string;
  labelStyle: CvLabelStyle;
  sectionDivider: CvSectionDivider;
  pdfMargin: number;
  pdfFontSize: number;
  pdfLineHeight: number;
};

export type CvTemplateDefinition = {
  id: CvTemplateId;
  label: string;
  description: string;
  category: CvTemplateCategory;
  bestFor: string[];
  defaultDensity?: 'compact' | 'regular' | 'airy';
  tokens: CvThemeTokens;
};

export const CV_TEMPLATE_CATEGORIES: { id: CvTemplateCategory; label: string }[] = [
  { id: 'popular', label: 'Popular' },
  { id: 'corporate', label: 'Corporate' },
  { id: 'creative', label: 'Creative' },
  { id: 'technical', label: 'Technical' },
  { id: 'academic', label: 'Academic' },
  { id: 'statement', label: 'Statement' },
];

const BASE: CvThemeTokens = {
  layout: 'standard',
  headingFont: 'serif',
  bodyFont: 'sans',
  headerColor: '#0a0a0a',
  roleColor: '#0a0a0a',
  accentColor: '#0a0a0a',
  sectionLabelColor: '#737373',
  bodyColor: '#171717',
  paperBg: '#ffffff',
  headerBorder: '1px solid #e5e5e5',
  nameSize: '1.5rem',
  nameWeight: '600',
  roleSize: '0.9375rem',
  sectionLabelSize: '0.75rem',
  sectionLabelTracking: '0.05em',
  bodySize: '0.875rem',
  bodyLeading: '1.6',
  sectionGap: '1rem',
  headerPaddingBottom: '1rem',
  labelStyle: 'uppercase',
  sectionDivider: 'line',
  pdfMargin: 56,
  pdfFontSize: 11,
  pdfLineHeight: 14,
};

function tokens(partial: Partial<CvThemeTokens>): CvThemeTokens {
  return { ...BASE, ...partial };
}

const CATEGORY_DIVIDER: Record<CvTemplateCategory, CvSectionDivider> = {
  popular: 'line',
  corporate: 'line',
  creative: 'underline',
  technical: 'accent-bar',
  academic: 'line',
  statement: 'accent-bar',
};

const TEMPLATE_BEST_FOR: Record<CvTemplateId, string[]> = {
  classic: ['General', 'Career change'],
  modern: ['Tech', 'Startups'],
  compact: ['Long careers', 'Senior roles'],
  executive: ['Leadership', 'C-suite'],
  minimal: ['Design', 'Consulting'],
  corporate: ['Finance', 'Operations'],
  banking: ['Banking', 'Risk'],
  legal: ['Legal', 'Compliance'],
  consulting: ['Strategy', 'Advisory'],
  nonprofit: ['Charity', 'Public sector'],
  studio: ['Design', 'Creative'],
  editorial: ['Writing', 'Media'],
  portfolio: ['UX', 'Product design'],
  vibrant: ['Marketing', 'Sales'],
  magazine: ['Brand', 'Communications'],
  engineer: ['Software', 'DevOps'],
  data: ['Analytics', 'ML'],
  startup: ['Founders', 'Product'],
  cloud: ['Infrastructure', 'SRE'],
  product: ['Product', 'Growth'],
  scholar: ['PhD', 'Research'],
  research: ['Academia', 'Policy'],
  teaching: ['Education', 'Training'],
  medical: ['Healthcare', 'Clinical'],
  scientific: ['Lab', 'Research'],
  impact: ['Leadership', 'Board'],
  statement: ['Director', 'VP'],
  accent: ['Bold profiles', 'Sales'],
  europass: ['EU roles', 'Mobility'],
  international: ['Global', 'Remote'],
};

function defineTemplate(
  id: CvTemplateId,
  label: string,
  description: string,
  category: CvTemplateCategory,
  tokenPartial: Partial<CvThemeTokens>,
  options?: {
    defaultDensity?: CvTemplateDefinition['defaultDensity'];
    bestFor?: string[];
    sectionDivider?: CvSectionDivider;
  }
): CvTemplateDefinition {
  return {
    id,
    label,
    description,
    category,
    bestFor: options?.bestFor ?? TEMPLATE_BEST_FOR[id],
    defaultDensity: options?.defaultDensity,
    tokens: tokens({
      sectionDivider: options?.sectionDivider ?? CATEGORY_DIVIDER[category],
      ...tokenPartial,
    }),
  };
}

export const CV_TEMPLATE_LIBRARY: CvTemplateDefinition[] = [
  defineTemplate('classic', 'Classic', 'Serif name, neutral labels, single column', 'popular', {
    headingFont: 'serif',
    headerBorder: '1px solid #e5e5e5',
  }),
  defineTemplate('modern', 'Modern', 'Sans-serif, bold rule, high-contrast labels', 'popular', {
    headingFont: 'sans',
    bodyFont: 'sans',
    headerColor: '#0a0a0a',
    roleColor: '#404040',
    sectionLabelColor: '#0a0a0a',
    headerBorder: '2px solid #0a0a0a',
    nameSize: '1.55rem',
    nameWeight: '700',
    sectionLabelSize: '0.68rem',
    sectionLabelTracking: '0.14em',
    bodyLeading: '1.55',
    headerPaddingBottom: '0.85rem',
  }),
  defineTemplate(
    'compact',
    'Compact',
    'Dense spacing for long careers on fewer pages',
    'popular',
    {
      nameSize: '1.2rem',
      roleSize: '0.8125rem',
      sectionLabelSize: '0.6875rem',
      bodySize: '0.8125rem',
      bodyLeading: '1.45',
      sectionGap: '0.6rem',
      headerPaddingBottom: '0.55rem',
      accentColor: '#525252',
      pdfMargin: 42,
      pdfFontSize: 10,
      pdfLineHeight: 12,
    },
    { defaultDensity: 'compact' }
  ),
  defineTemplate('executive', 'Executive', 'Navy sidebar, serif authority', 'popular', {
    layout: 'sidebar',
    headingFont: 'serif',
    headerColor: '#1e3a5f',
    roleColor: '#475569',
    accentColor: '#1e3a5f',
    sectionLabelColor: '#1e3a5f',
    bodyColor: '#1f2937',
    headerBorder: '1px solid #cbd5e1',
    nameSize: '1.6rem',
    sectionLabelTracking: '0.08em',
    bodyLeading: '1.58',
    sectionGap: '0.95rem',
    headerPaddingBottom: '0.9rem',
  }),
  defineTemplate(
    'minimal',
    'Minimal',
    'Centred header, soft greys, airy whitespace',
    'popular',
    {
      layout: 'centered',
      headingFont: 'sans',
      bodyFont: 'sans',
      roleColor: '#737373',
      accentColor: '#a3a3a3',
      sectionLabelColor: '#a3a3a3',
      bodyColor: '#404040',
      headerBorder: 'none',
      nameSize: '1.45rem',
      nameWeight: '500',
      roleSize: '0.875rem',
      bodyLeading: '1.65',
      sectionGap: '1.15rem',
      headerPaddingBottom: '1.1rem',
      labelStyle: 'sentence',
      pdfMargin: 64,
      pdfLineHeight: 15,
    },
    { defaultDensity: 'airy' }
  ),

  defineTemplate('corporate', 'Corporate', 'Clean navy header for formal industries', 'corporate', {
    headingFont: 'sans',
    headerColor: '#1e3a5f',
    roleColor: '#475569',
    accentColor: '#1e3a5f',
    sectionLabelColor: '#64748b',
    bodyColor: '#1f2937',
    headerBorder: '1px solid #cbd5e1',
    nameWeight: '700',
  }),
  defineTemplate(
    'banking',
    'Banking',
    'Conservative charcoal, tight and trustworthy',
    'corporate',
    {
      headingFont: 'serif',
      headerColor: '#18181b',
      roleColor: '#3f3f46',
      accentColor: '#27272a',
      sectionLabelColor: '#71717a',
      bodyColor: '#27272a',
      headerBorder: '1px solid #d4d4d8',
      nameSize: '1.35rem',
      bodySize: '0.8125rem',
      bodyLeading: '1.5',
      sectionGap: '0.75rem',
      headerPaddingBottom: '0.7rem',
      pdfMargin: 48,
      pdfFontSize: 10,
      pdfLineHeight: 13,
    },
    { defaultDensity: 'compact' }
  ),
  defineTemplate(
    'legal',
    'Legal',
    'Traditional serif, restrained black-and-white',
    'corporate',
    {
      headingFont: 'serif',
      bodyFont: 'serif',
      headerColor: '#0a0a0a',
      roleColor: '#262626',
      accentColor: '#171717',
      sectionLabelColor: '#525252',
      bodyColor: '#171717',
      headerBorder: '2px solid #0a0a0a',
      nameSize: '1.45rem',
      nameWeight: '700',
      sectionLabelTracking: '0.1em',
      bodyLeading: '1.55',
    },
    { defaultDensity: 'compact' }
  ),
  defineTemplate('consulting', 'Consulting', 'Sidebar slate layout for strategy profiles', 'corporate', {
    layout: 'sidebar',
    headingFont: 'sans',
    bodyFont: 'sans',
    headerColor: '#334155',
    roleColor: '#475569',
    accentColor: '#334155',
    sectionLabelColor: '#64748b',
    bodyColor: '#334155',
    headerBorder: '1px solid #cbd5e1',
    nameWeight: '700',
    sectionGap: '1.05rem',
  }),
  defineTemplate('nonprofit', 'Nonprofit', 'Warm mission-driven palette with approachable tone', 'corporate', {
    headingFont: 'sans',
    headerColor: '#14532d',
    roleColor: '#166534',
    accentColor: '#15803d',
    sectionLabelColor: '#166534',
    bodyColor: '#1c1917',
    headerBorder: '1px solid #bbf7d0',
    labelStyle: 'sentence',
    bodyLeading: '1.62',
  }),

  defineTemplate('studio', 'Studio', 'Centred creative layout with indigo accent', 'creative', {
    layout: 'centered',
    headingFont: 'sans',
    bodyFont: 'sans',
    headerColor: '#312e81',
    roleColor: '#6366f1',
    accentColor: '#4f46e5',
    sectionLabelColor: '#6366f1',
    bodyColor: '#1e1b4b',
    headerBorder: 'none',
    nameSize: '1.6rem',
    nameWeight: '700',
    labelStyle: 'sentence',
    sectionGap: '1.1rem',
  }),
  defineTemplate(
    'editorial',
    'Editorial',
    'Magazine-style serif with generous leading',
    'creative',
    {
      layout: 'centered',
      headingFont: 'serif',
      bodyFont: 'serif',
      headerColor: '#0a0a0a',
      roleColor: '#525252',
      accentColor: '#737373',
      sectionLabelColor: '#737373',
      bodyColor: '#262626',
      headerBorder: 'none',
      nameSize: '1.7rem',
      nameWeight: '500',
      bodyLeading: '1.7',
      sectionGap: '1.2rem',
      labelStyle: 'sentence',
      pdfMargin: 64,
      pdfLineHeight: 15,
    },
    { defaultDensity: 'airy' }
  ),
  defineTemplate('portfolio', 'Portfolio', 'Sidebar layout for designers and makers', 'creative', {
    layout: 'sidebar',
    headingFont: 'sans',
    bodyFont: 'sans',
    headerColor: '#0a0a0a',
    roleColor: '#525252',
    accentColor: '#db2777',
    sectionLabelColor: '#db2777',
    bodyColor: '#171717',
    headerBorder: '1px solid #fbcfe8',
    nameWeight: '700',
    labelStyle: 'sentence',
  }),
  defineTemplate('vibrant', 'Vibrant', 'Teal accent bar with energetic sans-serif', 'creative', {
    headingFont: 'sans',
    bodyFont: 'sans',
    headerColor: '#115e59',
    roleColor: '#0f766e',
    accentColor: '#0d9488',
    sectionLabelColor: '#0f766e',
    bodyColor: '#134e4a',
    headerBorder: '2px solid #0d9488',
    nameWeight: '700',
    sectionLabelTracking: '0.1em',
  }),
  defineTemplate('magazine', 'Magazine', 'Bold headline with copper accent rule', 'creative', {
    headingFont: 'serif',
    bodyFont: 'sans',
    headerColor: '#0a0a0a',
    roleColor: '#44403c',
    accentColor: '#c2410c',
    sectionLabelColor: '#c2410c',
    bodyColor: '#292524',
    headerBorder: '3px solid #c2410c',
    nameSize: '1.65rem',
    nameWeight: '700',
    sectionLabelTracking: '0.12em',
  }),

  defineTemplate(
    'engineer',
    'Engineer',
    'Technical blue palette, efficient single column',
    'technical',
    {
      headingFont: 'sans',
      bodyFont: 'sans',
      headerColor: '#1e3a8a',
      roleColor: '#1d4ed8',
      accentColor: '#2563eb',
      sectionLabelColor: '#3b82f6',
      bodyColor: '#1e293b',
      headerBorder: '1px solid #bfdbfe',
      nameWeight: '700',
      bodySize: '0.8125rem',
      sectionGap: '0.8rem',
      pdfFontSize: 10,
      pdfLineHeight: 13,
    },
    { defaultDensity: 'compact' }
  ),
  defineTemplate('data', 'Data', 'Indigo analytics style with compact labels', 'technical', {
    headingFont: 'sans',
    bodyFont: 'sans',
    headerColor: '#312e81',
    roleColor: '#4338ca',
    accentColor: '#4f46e5',
    sectionLabelColor: '#6366f1',
    bodyColor: '#1e1b4b',
    headerBorder: '1px solid #c7d2fe',
    sectionLabelSize: '0.6875rem',
    bodySize: '0.8125rem',
    sectionGap: '0.75rem',
  }, { defaultDensity: 'compact' }),
  defineTemplate('startup', 'Startup', 'Modern orange accent for founders and PMs', 'technical', {
    headingFont: 'sans',
    bodyFont: 'sans',
    headerColor: '#0a0a0a',
    roleColor: '#525252',
    accentColor: '#ea580c',
    sectionLabelColor: '#ea580c',
    bodyColor: '#171717',
    headerBorder: '2px solid #ea580c',
    nameWeight: '700',
    sectionLabelTracking: '0.12em',
  }),
  defineTemplate('cloud', 'Cloud', 'Azure sidebar for infrastructure roles', 'technical', {
    layout: 'sidebar',
    headingFont: 'sans',
    bodyFont: 'sans',
    headerColor: '#0c4a6e',
    roleColor: '#0369a1',
    accentColor: '#0284c7',
    sectionLabelColor: '#0284c7',
    bodyColor: '#0f172a',
    headerBorder: '1px solid #bae6fd',
    nameWeight: '700',
  }),
  defineTemplate('product', 'Product', 'Balanced sans layout for product leaders', 'technical', {
    headingFont: 'sans',
    bodyFont: 'sans',
    headerColor: '#581c87',
    roleColor: '#7e22ce',
    accentColor: '#9333ea',
    sectionLabelColor: '#a855f7',
    bodyColor: '#3b0764',
    headerBorder: '1px solid #e9d5ff',
    labelStyle: 'sentence',
    bodyLeading: '1.58',
  }),

  defineTemplate(
    'scholar',
    'Scholar',
    'Academic burgundy serif with airy spacing',
    'academic',
    {
      headingFont: 'serif',
      bodyFont: 'serif',
      headerColor: '#7f1d1d',
      roleColor: '#991b1b',
      accentColor: '#991b1b',
      sectionLabelColor: '#b91c1c',
      bodyColor: '#292524',
      headerBorder: '1px solid #fecaca',
      bodyLeading: '1.65',
      sectionGap: '1.15rem',
      labelStyle: 'sentence',
      pdfMargin: 64,
      pdfLineHeight: 15,
    },
    { defaultDensity: 'airy' }
  ),
  defineTemplate('research', 'Research', 'Forest green for research and policy', 'academic', {
    headingFont: 'serif',
    bodyFont: 'sans',
    headerColor: '#14532d',
    roleColor: '#166534',
    accentColor: '#166534',
    sectionLabelColor: '#15803d',
    bodyColor: '#1c1917',
    headerBorder: '1px solid #bbf7d0',
    labelStyle: 'sentence',
    bodyLeading: '1.62',
  }),
  defineTemplate(
    'teaching',
    'Teaching',
    'Centred warm layout for educators',
    'academic',
    {
      layout: 'centered',
      headingFont: 'serif',
      bodyFont: 'sans',
      headerColor: '#9a3412',
      roleColor: '#c2410c',
      accentColor: '#ea580c',
      sectionLabelColor: '#ea580c',
      bodyColor: '#431407',
      headerBorder: 'none',
      labelStyle: 'sentence',
      sectionGap: '1.1rem',
      bodyLeading: '1.65',
    },
    { defaultDensity: 'airy' }
  ),
  defineTemplate('medical', 'Medical', 'Clinical blue, precise and readable', 'academic', {
    headingFont: 'sans',
    bodyFont: 'sans',
    headerColor: '#0c4a6e',
    roleColor: '#075985',
    accentColor: '#0369a1',
    sectionLabelColor: '#0284c7',
    bodyColor: '#0f172a',
    headerBorder: '1px solid #bae6fd',
    bodySize: '0.8125rem',
    sectionGap: '0.8rem',
  }, { defaultDensity: 'compact' }),
  defineTemplate(
    'scientific',
    'Scientific',
    'Neutral lab-note style with sentence labels',
    'academic',
    {
      headingFont: 'serif',
      bodyFont: 'sans',
      headerColor: '#1f2937',
      roleColor: '#374151',
      accentColor: '#4b5563',
      sectionLabelColor: '#6b7280',
      bodyColor: '#1f2937',
      headerBorder: '1px solid #d1d5db',
      labelStyle: 'sentence',
      bodyLeading: '1.58',
      pdfMargin: 58,
    }
  ),

  defineTemplate('impact', 'Impact', 'Oversized name with bold accent rule', 'statement', {
    headingFont: 'sans',
    bodyFont: 'sans',
    headerColor: '#0a0a0a',
    roleColor: '#404040',
    accentColor: '#0a0a0a',
    sectionLabelColor: '#0a0a0a',
    bodyColor: '#171717',
    headerBorder: '3px solid #0a0a0a',
    nameSize: '1.75rem',
    nameWeight: '800',
    sectionLabelTracking: '0.14em',
    headerPaddingBottom: '0.75rem',
  }),
  defineTemplate('statement', 'Statement', 'Burgundy sidebar for senior leadership', 'statement', {
    layout: 'sidebar',
    headingFont: 'serif',
    headerColor: '#7f1d1d',
    roleColor: '#991b1b',
    accentColor: '#991b1b',
    sectionLabelColor: '#b91c1c',
    bodyColor: '#292524',
    headerBorder: '1px solid #fecaca',
    nameSize: '1.55rem',
    nameWeight: '700',
  }),
  defineTemplate('accent', 'Accent bar', 'Full-width colour header band', 'statement', {
    headingFont: 'sans',
    bodyFont: 'sans',
    headerColor: '#ffffff',
    roleColor: '#e0e7ff',
    accentColor: '#312e81',
    sectionLabelColor: '#4338ca',
    bodyColor: '#1e1b4b',
    headerBorder: 'none',
    nameSize: '1.55rem',
    nameWeight: '700',
    headerPaddingBottom: '1.2rem',
    sectionLabelTracking: '0.1em',
  }),
  defineTemplate(
    'europass',
    'Europass',
    'EU-style compact blue format',
    'statement',
    {
      headingFont: 'sans',
      bodyFont: 'sans',
      headerColor: '#1e40af',
      roleColor: '#1d4ed8',
      accentColor: '#2563eb',
      sectionLabelColor: '#2563eb',
      bodyColor: '#1e293b',
      headerBorder: '2px solid #2563eb',
      nameSize: '1.25rem',
      bodySize: '0.8125rem',
      sectionGap: '0.65rem',
      headerPaddingBottom: '0.6rem',
      sectionLabelTracking: '0.08em',
      pdfMargin: 44,
      pdfFontSize: 10,
      pdfLineHeight: 12,
    },
    { defaultDensity: 'compact' }
  ),
  defineTemplate('international', 'International', 'Centred global profile with slate tones', 'statement', {
    layout: 'centered',
    headingFont: 'sans',
    bodyFont: 'sans',
    headerColor: '#334155',
    roleColor: '#64748b',
    accentColor: '#475569',
    sectionLabelColor: '#64748b',
    bodyColor: '#334155',
    headerBorder: '1px solid #cbd5e1',
    labelStyle: 'sentence',
    sectionGap: '1rem',
    pdfMargin: 60,
  }),
];

export function isCvTemplateId(value: string): value is CvTemplateId {
  return CV_TEMPLATE_IDS.includes(value as CvTemplateId);
}

export function getCvTemplateDefinition(id: CvTemplateId): CvTemplateDefinition {
  return CV_TEMPLATE_LIBRARY.find((template) => template.id === id) ?? CV_TEMPLATE_LIBRARY[0];
}

export function getCvTemplatesByCategory(category: CvTemplateCategory): CvTemplateDefinition[] {
  return CV_TEMPLATE_LIBRARY.filter((template) => template.category === category);
}

export function presetDefaultDensity(id: CvTemplateId): 'compact' | 'regular' | 'airy' {
  return getCvTemplateDefinition(id).defaultDensity ?? 'regular';
}

export type CvTemplateFilter = CvTemplateCategory | 'all';

export function searchCvTemplates(query: string, category: CvTemplateFilter = 'all'): CvTemplateDefinition[] {
  const pool = category === 'all' ? CV_TEMPLATE_LIBRARY : getCvTemplatesByCategory(category);
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return pool;

  return pool.filter((template) => {
    const haystack = [
      template.label,
      template.description,
      template.category,
      ...template.bestFor,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(trimmed);
  });
}
