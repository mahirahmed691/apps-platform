import { resolveCvThemeTokens, styleConfigFromTemplate, type CvStyleConfig } from '@/lib/cvStyleConfig';
import { sectionUsesBullets, splitIntoBulletItems } from '@/lib/cvContentFormat';
import { hexToRgb } from '@/lib/cvThemeStyles';
import type { CvThemeTokens } from '@/lib/cvThemes';
import type { PdfTemplate } from '@/lib/studioFeatures';
import {
  CV_SIDEBAR_COLUMN_SECTIONS,
  CV_SIDEBAR_MAIN_SECTIONS,
  type CvPreviewDocument,
  type CvPreviewSection,
} from '@/lib/cvPreviewDocument';
import { parseGeneratedCvDocument } from '@/lib/parseGeneratedCv';
import { downloadCvPdfFromElement, findExportableCvElement } from '@/lib/exportCvPdfFromDom';
import type { jsPDF } from 'jspdf';

type ParseFallback = {
  fullName?: string;
  targetRole?: string;
  recentRole?: string;
};

type RenderContext = {
  doc: jsPDF;
  tokens: CvThemeTokens;
  style: CvStyleConfig;
  margin: number;
  pageWidth: number;
  pageHeight: number;
  contentWidth: number;
  headingFont: string;
  bodyFont: string;
  bodySize: number;
  bodyLeading: number;
  nameSize: number;
  roleSize: number;
  labelSize: number;
  sectionGap: number;
  headerPadding: number;
};

export async function downloadCvPdf(
  source: CvPreviewDocument | string,
  filename = 'ceevie-cv.pdf',
  styleOrTemplate: CvStyleConfig | PdfTemplate = 'classic',
  parseFallback?: ParseFallback
): Promise<void> {
  const previewElement = findExportableCvElement();
  if (previewElement) {
    const exported = await downloadCvPdfFromElement(previewElement, filename);
    if (exported) return;
  }

  const document =
    typeof source === 'string' ? parseGeneratedCvDocument(source, parseFallback) : source;

  const hasContent =
    Boolean(document.fullName.trim()) ||
    Boolean(document.targetRole.trim()) ||
    document.sections.some((section) => section.value.trim());
  if (!hasContent) return;

  const styleConfig =
    typeof styleOrTemplate === 'string' ? styleConfigFromTemplate(styleOrTemplate) : styleOrTemplate;
  const tokens = resolveCvThemeTokens(styleConfig);

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const ctx = buildContext(doc, tokens, styleConfig);

  if (tokens.layout === 'sidebar') {
    renderSidebarDocument(ctx, document);
  } else {
    renderSingleColumnDocument(ctx, document);
  }

  doc.save(filename);
}

function buildContext(doc: jsPDF, tokens: CvThemeTokens, style: CvStyleConfig): RenderContext {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = tokens.pdfMargin;

  return {
    doc,
    tokens,
    style,
    margin,
    pageWidth,
    pageHeight,
    contentWidth: pageWidth - margin * 2,
    headingFont: pdfFont(tokens.headingFont),
    bodyFont: pdfFont(tokens.bodyFont),
    bodySize: tokens.pdfFontSize,
    bodyLeading: tokens.pdfLineHeight,
    nameSize: remToPt(tokens.nameSize, tokens.pdfFontSize + 10),
    roleSize: remToPt(tokens.roleSize, tokens.pdfFontSize + 1),
    labelSize: remToPt(tokens.sectionLabelSize, tokens.pdfFontSize - 1),
    sectionGap: remToPt(tokens.sectionGap, 14),
    headerPadding: remToPt(tokens.headerPaddingBottom, 12),
  };
}

function renderSingleColumnDocument(ctx: RenderContext, document: CvPreviewDocument) {
  let y = ctx.margin;
  y = drawDocumentHeader(ctx, document, ctx.margin, y, ctx.contentWidth, ctx.tokens.layout === 'centered');

  for (const section of document.sections) {
    if (!section.value.trim()) continue;
    y = drawSection(ctx, section, ctx.margin, y, ctx.contentWidth);
  }
}

function renderSidebarDocument(ctx: RenderContext, document: CvPreviewDocument) {
  const sidebarWidth = ctx.contentWidth * 0.3;
  const gap = 16;
  const mainX = ctx.margin + sidebarWidth + gap;
  const mainWidth = ctx.contentWidth - sidebarWidth - gap;

  let sidebarY = ctx.margin;
  let mainY = ctx.margin;

  sidebarY = drawDocumentHeader(ctx, document, ctx.margin, sidebarY, sidebarWidth, false);
  mainY = Math.max(mainY, sidebarY);

  const sidebarSections = document.sections.filter((section) =>
    CV_SIDEBAR_COLUMN_SECTIONS.includes(section.key)
  );
  const mainSections = document.sections.filter((section) => CV_SIDEBAR_MAIN_SECTIONS.includes(section.key));

  for (const section of sidebarSections) {
    if (!section.value.trim()) continue;
    sidebarY = drawSection(ctx, section, ctx.margin, sidebarY, sidebarWidth);
  }

  for (const section of mainSections) {
    if (!section.value.trim()) continue;
    mainY = drawSection(ctx, section, mainX, mainY, mainWidth);
  }

  drawSidebarAccent(ctx, ctx.margin);
}

function drawDocumentHeader(
  ctx: RenderContext,
  document: CvPreviewDocument,
  x: number,
  y: number,
  width: number,
  centered: boolean
): number {
  const { doc, tokens } = ctx;
  const align = centered ? 'center' : 'left';
  const textX = centered ? x + width / 2 : x;

  if (document.fullName.trim()) {
    doc.setFont(ctx.headingFont, tokens.nameWeight === '700' ? 'bold' : 'normal');
    doc.setFontSize(ctx.nameSize);
    setTextColor(doc, tokens.headerColor);
    y = drawLines(doc, [document.fullName.trim()], textX, y, width, ctx.nameSize + 4, align, false, ctx) + 4;
  }

  if (document.targetRole.trim()) {
    doc.setFont(ctx.bodyFont, 'normal');
    doc.setFontSize(ctx.roleSize);
    setTextColor(doc, tokens.roleColor);
    y = drawLines(doc, [document.targetRole.trim()], textX, y, width, ctx.roleSize + 4, align, false, ctx) + 2;
  }

  if (tokens.layout !== 'sidebar' && document.recentRole.trim()) {
    doc.setFont(ctx.bodyFont, 'normal');
    doc.setFontSize(ctx.bodySize);
    setTextColor(doc, tokens.bodyColor);
    const subtitle = doc.splitTextToSize(document.recentRole.trim(), width) as string[];
    y = drawLines(doc, subtitle, textX, y, width, ctx.bodyLeading, align, true, ctx) + 2;
  }

  if (tokens.headerBorder !== 'none') {
    const lineY = y + 4;
    setDrawColor(doc, tokens.accentColor);
    doc.setLineWidth(tokens.headerBorder.includes('2px') || tokens.headerBorder.includes('3px') ? 1.5 : 0.75);
    doc.line(x, lineY, x + width, lineY);
    y = lineY + ctx.headerPadding;
  } else {
    y += ctx.headerPadding;
  }

  setTextColor(doc, tokens.bodyColor);
  return y;
}

function drawSection(ctx: RenderContext, section: CvPreviewSection, x: number, y: number, width: number): number {
  const { doc, tokens, style } = ctx;
  const label = formatSectionLabel(section.label, style.labelStyle);

  doc.setFont(ctx.headingFont, 'bold');
  doc.setFontSize(ctx.labelSize);
  setTextColor(doc, tokens.sectionLabelColor);
  y = ensureSpace(ctx, y, ctx.labelSize + 8);
  doc.text(label, x, y);
  y += ctx.labelSize + 2;

  if (tokens.sectionDivider === 'line' || tokens.sectionDivider === 'underline') {
    setDrawColor(doc, tokens.accentColor);
    doc.setLineWidth(0.5);
    doc.line(x, y, x + width, y);
    y += 6;
  } else {
    y += 4;
  }

  doc.setFont(ctx.bodyFont, 'normal');
  doc.setFontSize(ctx.bodySize);
  setTextColor(doc, tokens.bodyColor);

  const content = section.value.trim();
  if (sectionUsesBullets(section.key, style.contentFormat)) {
    const items = splitIntoBulletItems(content, section.key);
    if (items.length > 1) {
      for (const item of items) {
        y = ensureSpace(ctx, y, ctx.bodyLeading);
        const bulletLines = doc.splitTextToSize(`• ${item}`, width - 8) as string[];
        y = drawLines(doc, bulletLines, x + 8, y, width - 8, ctx.bodyLeading, 'left', true, ctx);
      }
      return y + ctx.sectionGap;
    }
  }

  const lines = doc.splitTextToSize(content, width) as string[];
  y = drawLines(doc, lines, x, y, width, ctx.bodyLeading, 'left', true, ctx);
  return y + ctx.sectionGap;
}

function drawSidebarAccent(ctx: RenderContext, x: number) {
  const { doc, tokens, margin, pageHeight } = ctx;
  setDrawColor(doc, tokens.accentColor);
  doc.setLineWidth(3);
  doc.line(x - 6, margin - 4, x - 6, pageHeight - margin + 4);
}

function drawLines(
  doc: jsPDF,
  lines: string[],
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  align: 'left' | 'center' | 'right',
  alreadyWrapped = false,
  ctx?: RenderContext
): number {
  const output = alreadyWrapped ? lines : (doc.splitTextToSize(lines.join('\n'), maxWidth) as string[]);
  for (const line of output) {
    if (ctx) y = ensureSpace(ctx, y, lineHeight);
    doc.text(line, x, y, { align, maxWidth });
    y += lineHeight;
  }
  return y;
}

function ensureSpace(ctx: RenderContext, y: number, needed: number): number {
  if (y + needed <= ctx.pageHeight - ctx.margin) return y;
  ctx.doc.addPage();
  setTextColor(ctx.doc, ctx.tokens.bodyColor);
  return ctx.margin;
}

function formatSectionLabel(label: string, labelStyle: CvStyleConfig['labelStyle']): string {
  const trimmed = label.trim();
  return labelStyle === 'uppercase' ? trimmed.toUpperCase() : trimmed;
}

function pdfFont(family: 'serif' | 'sans'): string {
  return family === 'serif' ? 'times' : 'helvetica';
}

function remToPt(value: string, fallback: number): number {
  const match = value.match(/^([\d.]+)rem$/);
  if (!match) return fallback;
  return Math.round(Number.parseFloat(match[1]) * 12);
}

function setTextColor(doc: jsPDF, hex: string) {
  const [r, g, b] = hexToRgb(hex);
  doc.setTextColor(r, g, b);
}

function setDrawColor(doc: jsPDF, hex: string) {
  const [r, g, b] = hexToRgb(hex);
  doc.setDrawColor(r, g, b);
}
