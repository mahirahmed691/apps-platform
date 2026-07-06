const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;
const DEFAULT_PAPER_WIDTH_PX = 794;
const CAPTURE_SCALE = 1.5;

function getPaperWidthPx(): number {
  if (typeof window === 'undefined') return DEFAULT_PAPER_WIDTH_PX;

  const fromRoot = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue('--cv-paper-width')
    .trim();
  const parsed = Number.parseFloat(fromRoot);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;

  return DEFAULT_PAPER_WIDTH_PX;
}

export function findExportableCvElement(): HTMLElement | null {
  if (typeof document === 'undefined') return null;

  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>(
      '[data-cv-export-root="true"], .preview-doc-live, .result-printable'
    )
  );

  for (const element of candidates) {
    if (!isElementVisible(element)) continue;
    return element;
  }

  return null;
}

function isElementVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  if (rect.width < 40 || rect.height < 40) return false;

  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
}

function prepareClone(source: HTMLElement): { host: HTMLElement; cleanup: () => void } {
  const paperWidthPx = getPaperWidthPx();
  const clone = source.cloneNode(true) as HTMLElement;

  clone.querySelectorAll('input, textarea').forEach((field) => {
    const input = field as HTMLInputElement | HTMLTextAreaElement;
    const replacement = document.createElement('div');
    replacement.className = input.className.replace(/-input/g, '');
    replacement.textContent = input.value;
    replacement.style.whiteSpace = 'pre-wrap';
    input.replaceWith(replacement);
  });

  clone.style.boxShadow = 'none';
  clone.style.transform = 'none';
  clone.style.animation = 'none';
  clone.style.margin = '0';
  clone.style.maxWidth = `${paperWidthPx}px`;
  clone.style.width = `${paperWidthPx}px`;
  clone.style.height = 'auto';
  clone.style.minHeight = 'auto';
  clone.style.overflow = 'visible';
  clone.style.aspectRatio = 'auto';
  clone.style.flex = 'none';
  clone.style.border = 'none';
  clone.style.borderRadius = '0';
  clone.style.background = '#ffffff';
  clone.style.color = '#0a0a0a';

  const rootStyles = getComputedStyle(document.documentElement);
  const padY = rootStyles.getPropertyValue('--cv-paper-padding-y').trim() || '2.25rem';
  const padX = rootStyles.getPropertyValue('--cv-paper-padding-x').trim() || '2.5rem';
  if (!clone.classList.contains('preview-doc-layout-sidebar')) {
    clone.style.padding = `${padY} ${padX}`;
  } else {
    clone.style.padding = '0';
  }

  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.position = 'fixed';
  host.style.left = '-100000px';
  host.style.top = '0';
  host.style.zIndex = '-1';
  host.style.width = `${paperWidthPx}px`;
  host.style.background = '#ffffff';
  host.style.padding = '0';
  host.style.margin = '0';
  host.appendChild(clone);
  document.body.appendChild(host);

  return {
    host,
    cleanup: () => {
      host.remove();
    },
  };
}

export async function downloadCvPdfFromElement(element: HTMLElement, filename: string): Promise<boolean> {
  const { host, cleanup } = prepareClone(element);
  const captureTarget = host.firstElementChild as HTMLElement;

  try {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    // Allow layout to settle at paper width before capture.
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });

    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(captureTarget, {
      scale: CAPTURE_SCALE,
      useCORS: true,
      backgroundColor: window.getComputedStyle(captureTarget).backgroundColor || '#ffffff',
      logging: false,
      scrollX: 0,
      scrollY: 0,
      width: captureTarget.scrollWidth,
      height: captureTarget.scrollHeight,
      windowWidth: captureTarget.scrollWidth,
      windowHeight: captureTarget.scrollHeight,
    });

    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });

    const imgWidth = A4_WIDTH_PT;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const imgData = canvas.toDataURL('image/png');

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= A4_HEIGHT_PT;

    while (heightLeft > 0) {
      position -= A4_HEIGHT_PT;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= A4_HEIGHT_PT;
    }

    pdf.save(filename);
    return true;
  } finally {
    cleanup();
  }
}
