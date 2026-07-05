const PAGE_MARGIN = 56;
const LINE_HEIGHT = 14;
const FONT_SIZE = 11;

export async function downloadCvPdf(text: string, filename = 'ceevie-cv.pdf'): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - PAGE_MARGIN * 2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONT_SIZE);

  const lines = doc.splitTextToSize(trimmed, maxWidth) as string[];
  let y = PAGE_MARGIN;

  for (const line of lines) {
    if (y > pageHeight - PAGE_MARGIN) {
      doc.addPage();
      y = PAGE_MARGIN;
    }
    doc.text(line, PAGE_MARGIN, y);
    y += LINE_HEIGHT;
  }

  doc.save(filename);
}
