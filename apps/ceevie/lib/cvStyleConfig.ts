import {
  getCvTemplate,
  isCvTemplate,
  presetDefaultDensity,
  type CvTemplate,
  type CvThemeTokens,
} from '@/lib/cvThemes';
import type { CvContentFormat } from '@/lib/cvContentFormat';
import type { CvFontFamily, CvLabelStyle, CvLayout } from '@/lib/cvTemplateLibrary';

export type { CvContentFormat };

export type CvDensity = 'compact' | 'regular' | 'airy';

export type CvHeaderRule = 'none' | 'hairline' | 'bold';

export type CvStyleConfig = {
  presetId: CvTemplate;
  layout: CvLayout;
  headingFont: CvFontFamily;
  bodyFont: CvFontFamily;
  headerColor: string;
  roleColor: string;
  accentColor: string;
  sectionLabelColor: string;
  bodyColor: string;
  labelStyle: CvLabelStyle;
  contentFormat: CvContentFormat;
  density: CvDensity;
  headerRule: CvHeaderRule;
};

export type CvColorPreset = {
  id: string;
  label: string;
  headerColor: string;
  roleColor: string;
  accentColor: string;
  sectionLabelColor: string;
  bodyColor: string;
};

export const CV_COLOR_PRESETS: CvColorPreset[] = [
  { id: 'charcoal', label: 'Charcoal', headerColor: '#0a0a0a', roleColor: '#0a0a0a', accentColor: '#0a0a0a', sectionLabelColor: '#737373', bodyColor: '#171717' },
  { id: 'navy', label: 'Navy', headerColor: '#1e3a5f', roleColor: '#475569', accentColor: '#1e3a5f', sectionLabelColor: '#1e3a5f', bodyColor: '#1f2937' },
  { id: 'forest', label: 'Forest', headerColor: '#14532d', roleColor: '#166534', accentColor: '#166534', sectionLabelColor: '#166534', bodyColor: '#1c1917' },
  { id: 'burgundy', label: 'Burgundy', headerColor: '#7f1d1d', roleColor: '#991b1b', accentColor: '#991b1b', sectionLabelColor: '#991b1b', bodyColor: '#292524' },
  { id: 'indigo', label: 'Indigo', headerColor: '#312e81', roleColor: '#4338ca', accentColor: '#4338ca', sectionLabelColor: '#4338ca', bodyColor: '#1e1b4b' },
  { id: 'slate', label: 'Slate', headerColor: '#334155', roleColor: '#475569', accentColor: '#475569', sectionLabelColor: '#64748b', bodyColor: '#334155' },
  { id: 'teal', label: 'Teal', headerColor: '#115e59', roleColor: '#0f766e', accentColor: '#0f766e', sectionLabelColor: '#0f766e', bodyColor: '#134e4a' },
  { id: 'copper', label: 'Copper', headerColor: '#9a3412', roleColor: '#c2410c', accentColor: '#c2410c', sectionLabelColor: '#c2410c', bodyColor: '#431407' },
];

const DENSITY_SCALE: Record<CvDensity, Partial<CvThemeTokens>> = {
  compact: {
    nameSize: '1.2rem',
    roleSize: '0.8125rem',
    sectionLabelSize: '0.6875rem',
    bodySize: '0.8125rem',
    bodyLeading: '1.45',
    sectionGap: '0.6rem',
    headerPaddingBottom: '0.55rem',
    pdfMargin: 42,
    pdfFontSize: 10,
    pdfLineHeight: 12,
  },
  regular: {
    nameSize: '1.5rem',
    roleSize: '0.9375rem',
    sectionLabelSize: '0.75rem',
    bodySize: '0.875rem',
    bodyLeading: '1.6',
    sectionGap: '1rem',
    headerPaddingBottom: '1rem',
    pdfMargin: 56,
    pdfFontSize: 11,
    pdfLineHeight: 14,
  },
  airy: {
    nameSize: '1.55rem',
    roleSize: '0.9375rem',
    sectionLabelSize: '0.72rem',
    bodySize: '0.875rem',
    bodyLeading: '1.68',
    sectionGap: '1.2rem',
    headerPaddingBottom: '1.15rem',
    pdfMargin: 64,
    pdfFontSize: 11,
    pdfLineHeight: 15,
  },
};

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export function sanitizeHexColor(value: string, fallback: string): string {
  const trimmed = value.trim();
  if (!HEX_COLOR.test(trimmed)) return fallback;
  return trimmed.toLowerCase();
}

export function styleConfigFromTemplate(presetId: CvTemplate): CvStyleConfig {
  const tokens = getCvTemplate(presetId).tokens;
  return {
    presetId,
    layout: tokens.layout,
    headingFont: tokens.headingFont,
    bodyFont: tokens.bodyFont,
    headerColor: tokens.headerColor,
    roleColor: tokens.roleColor,
    accentColor: tokens.accentColor,
    sectionLabelColor: tokens.sectionLabelColor,
    bodyColor: tokens.bodyColor,
    labelStyle: tokens.labelStyle,
    contentFormat: 'mixed',
    density: presetDefaultDensity(presetId),
    headerRule: tokens.headerBorder === 'none' ? 'none' : tokens.headerBorder.includes('2px') || tokens.headerBorder.includes('3px') ? 'bold' : 'hairline',
  };
}

export const DEFAULT_CV_STYLE: CvStyleConfig = styleConfigFromTemplate('classic');

function headerRuleToBorder(rule: CvHeaderRule, config: CvStyleConfig): string {
  if (rule === 'none') return 'none';
  if (rule === 'bold') return `2px solid ${config.accentColor}`;
  return `1px solid ${config.accentColor}`;
}

export function resolveCvThemeTokens(config: CvStyleConfig): CvThemeTokens {
  const preset = getCvTemplate(config.presetId).tokens;
  const density = DENSITY_SCALE[config.density];

  return {
    ...preset,
    ...density,
    layout: config.layout,
    headingFont: config.headingFont,
    bodyFont: config.bodyFont,
    headerColor: config.headerColor,
    roleColor: config.roleColor,
    accentColor: config.accentColor,
    sectionLabelColor: config.sectionLabelColor,
    bodyColor: config.bodyColor,
    paperBg: preset.paperBg,
    labelStyle: config.labelStyle,
    headerBorder: headerRuleToBorder(config.headerRule, config),
    nameWeight: config.headingFont === 'sans' && config.headerRule === 'bold' ? '700' : preset.nameWeight,
    sectionLabelTracking: config.labelStyle === 'uppercase' ? '0.08em' : '0.04em',
  };
}

export function normalizeCvStyleConfig(raw: Partial<CvStyleConfig> | null | undefined): CvStyleConfig {
  const presetId = raw?.presetId && isCvTemplate(raw.presetId) ? raw.presetId : DEFAULT_CV_STYLE.presetId;
  const base = styleConfigFromTemplate(presetId);

  return {
    presetId,
    layout: raw?.layout ?? base.layout,
    headingFont: raw?.headingFont ?? base.headingFont,
    bodyFont: raw?.bodyFont ?? base.bodyFont,
    headerColor: sanitizeHexColor(raw?.headerColor ?? base.headerColor, base.headerColor),
    roleColor: sanitizeHexColor(raw?.roleColor ?? base.roleColor, base.roleColor),
    accentColor: sanitizeHexColor(raw?.accentColor ?? base.accentColor, base.accentColor),
    sectionLabelColor: sanitizeHexColor(raw?.sectionLabelColor ?? base.sectionLabelColor, base.sectionLabelColor),
    bodyColor: sanitizeHexColor(raw?.bodyColor ?? base.bodyColor, base.bodyColor),
    labelStyle: raw?.labelStyle === 'sentence' ? 'sentence' : 'uppercase',
    contentFormat:
      raw?.contentFormat === 'bullets' || raw?.contentFormat === 'paragraph' || raw?.contentFormat === 'mixed'
        ? raw.contentFormat
        : base.contentFormat,
    density: raw?.density === 'compact' || raw?.density === 'airy' ? raw.density : 'regular',
    headerRule: raw?.headerRule === 'none' || raw?.headerRule === 'bold' ? raw.headerRule : 'hairline',
  };
}

export function findMatchingColorPreset(config: CvStyleConfig): string | null {
  const match = CV_COLOR_PRESETS.find(
    (preset) =>
      preset.headerColor === config.headerColor &&
      preset.roleColor === config.roleColor &&
      preset.accentColor === config.accentColor &&
      preset.sectionLabelColor === config.sectionLabelColor
  );
  return match?.id ?? null;
}
