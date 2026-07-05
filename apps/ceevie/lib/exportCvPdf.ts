const PAGE_MARGIN = 56;
const HEADER_HEIGHT = 28;
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

  function drawHeader() {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.text('CEEVIE', PAGE_MARGIN, PAGE_MARGIN);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('ceevie.co.uk', pageWidth - PAGE_MARGIN, PAGE_MARGIN, { align: 'right' });
    doc.setDrawColor(220, 220, 220);
    doc.line(PAGE_MARGIN, PAGE_MARGIN + 10, pageWidth - PAGE_MARGIN, PAGE_MARGIN + 10);
    doc.setTextColor(20, 20, 20);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(FONT_SIZE);

  const lines = doc.splitTextToSize(trimmed, maxWidth) as string[];
  let y = PAGE_MARGIN + HEADER_HEIGHT;
  drawHeader();

  for (const line of lines) {
    if (y > pageHeight - PAGE_MARGIN) {
      doc.addPage();
      y = PAGE_MARGIN + HEADER_HEIGHT;
      drawHeader();
    }
    doc.text(line, PAGE_MARGIN, y);
    y += LINE_HEIGHT;
  }

  doc.save(filename);
}
