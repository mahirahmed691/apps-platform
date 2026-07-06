import type { CSSProperties } from 'react';
import type { CvThemeTokens } from '@/lib/cvThemes';

function fontStack(family: CvThemeTokens['headingFont']): string {
  return family === 'serif' ? 'var(--font-serif)' : 'var(--font)';
}

export function cvThemeToStyleVars(tokens: CvThemeTokens): CSSProperties {
  return {
    '--cv-heading-font': fontStack(tokens.headingFont),
    '--cv-body-font': fontStack(tokens.bodyFont),
    '--cv-header-color': tokens.headerColor,
    '--cv-role-color': tokens.roleColor,
    '--cv-accent-color': tokens.accentColor,
    '--cv-section-label-color': tokens.sectionLabelColor,
    '--cv-body-color': tokens.bodyColor,
    '--cv-paper-bg': tokens.paperBg,
    '--cv-header-border': tokens.headerBorder,
    '--cv-name-size': tokens.nameSize,
    '--cv-name-weight': tokens.nameWeight,
    '--cv-role-size': tokens.roleSize,
    '--cv-section-label-size': tokens.sectionLabelSize,
    '--cv-section-label-tracking': tokens.sectionLabelTracking,
    '--cv-body-size': tokens.bodySize,
    '--cv-body-leading': tokens.bodyLeading,
    '--cv-section-gap': tokens.sectionGap,
    '--cv-header-padding-bottom': tokens.headerPaddingBottom,
    '--cv-label-transform': tokens.labelStyle === 'uppercase' ? 'uppercase' : 'none',
  } as CSSProperties;
}

export function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '').trim();
  if (normalized.length !== 6) return [20, 20, 20];

  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}
