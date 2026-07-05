import type { PdfTemplate } from '@/lib/studioFeatures';

const PAGE_MARGIN = 56;
const HEADER_HEIGHT = 28;
const LINE_HEIGHT = 14;
const FONT_SIZE = 11;

export async function downloadCvPdf(
  text: string,
  filename = 'ceevie-cv.pdf',
  template: PdfTemplate = 'classic'
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = template === 'compact' ? 42 : PAGE_MARGIN;
  const maxWidth = pageWidth - margin * 2;
  const fontSize = template === 'compact' ? 10 : FONT_SIZE;
  const lineHeight = template === 'compact' ? 12 : LINE_HEIGHT;

  function drawHeader() {
    doc.setFont('helvetica', template === 'modern' ? 'bold' : 'normal');
    doc.setFontSize(template === 'modern' ? 11 : 10);
    doc.setTextColor(template === 'modern' ? 20 : 40, template === 'modern' ? 20 : 40, template === 'modern' ? 20 : 40);
    doc.text('CEEVIE', margin, margin);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('ceevie.co.uk', pageWidth - margin, margin, { align: 'right' });
    doc.setDrawColor(template === 'modern' ? 30 : 220, template === 'modern' ? 30 : 220, template === 'modern' ? 30 : 220);
    doc.line(margin, margin + 10, pageWidth - margin, margin + 10);
    doc.setTextColor(20, 20, 20);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fontSize);

  const lines = doc.splitTextToSize(trimmed, maxWidth) as string[];
  let y = margin + HEADER_HEIGHT;
  drawHeader();

  for (const line of lines) {
    if (y > pageHeight - margin) {
      doc.addPage();
      y = margin + HEADER_HEIGHT;
      drawHeader();
    }
    doc.text(line, margin, y);
    y += lineHeight;
  }

  doc.save(filename);
}
