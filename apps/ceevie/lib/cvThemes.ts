import {
  CV_TEMPLATE_CATEGORIES,
  CV_TEMPLATE_LIBRARY,
  getCvTemplateDefinition,
  getCvTemplatesByCategory,
  isCvTemplateId,
  presetDefaultDensity,
  searchCvTemplates,
  type CvFontFamily,
  type CvLabelStyle,
  type CvLayout,
  type CvSectionDivider,
  type CvTemplateCategory,
  type CvTemplateDefinition,
  type CvTemplateFilter,
  type CvTemplateId,
  type CvThemeTokens,
} from '@/lib/cvTemplateLibrary';

export type CvTemplate = CvTemplateId;

export type {
  CvFontFamily,
  CvLabelStyle,
  CvLayout,
  CvSectionDivider,
  CvTemplateCategory,
  CvTemplateDefinition,
  CvTemplateFilter,
  CvThemeTokens,
};

export const CV_TEMPLATES = CV_TEMPLATE_LIBRARY;

export { CV_TEMPLATE_CATEGORIES, getCvTemplatesByCategory, presetDefaultDensity, searchCvTemplates };

export function isCvTemplate(value: string): value is CvTemplate {
  return isCvTemplateId(value);
}

export function getCvTemplate(id: CvTemplate): CvTemplateDefinition {
  return getCvTemplateDefinition(id);
}

export function formatCvLayout(layout: CvLayout): string {
  if (layout === 'sidebar') return 'Sidebar accent';
  if (layout === 'centered') return 'Centred header';
  return 'Single column';
}

export function formatCvFont(font: CvFontFamily): string {
  return font === 'serif' ? 'Serif' : 'Sans-serif';
}
