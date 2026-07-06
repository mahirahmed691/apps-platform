export type CvContentFormat = 'bullets' | 'paragraph' | 'mixed';

type FormattableSection = 'summary' | 'achievements' | 'experience' | 'skills' | 'education';

const MIXED_BULLET_SECTIONS = new Set<FormattableSection>(['achievements', 'experience', 'skills']);

export function sectionUsesBullets(sectionKey: string, format: CvContentFormat): boolean {
  if (format === 'bullets') return true;
  if (format === 'paragraph') return false;
  return MIXED_BULLET_SECTIONS.has(sectionKey as FormattableSection);
}

export function splitIntoBulletItems(text: string, sectionKey: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  if (sectionKey === 'skills') {
    return trimmed
      .split(/[,;\n]|(?:\s+•\s+)|(?:^•\s+)/m)
      .map((item) => item.trim().replace(/^[-•*]\s*/, ''))
      .filter(Boolean);
  }

  const lines = trimmed
    .split(/\n+/)
    .map((line) => line.trim().replace(/^[-•*]\s*/, ''))
    .filter(Boolean);

  if (lines.length > 1) return lines;

  if (sectionKey === 'summary' || sectionKey === 'education') {
    return [trimmed];
  }

  const sentences = trimmed
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);

  if (sentences.length > 1) return sentences;
  return [trimmed];
}

export function formatCvTextForExport(text: string, format: CvContentFormat): string {
  const blocks = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length === 0) return text.trim();

  return blocks
    .map((block, index) => {
      const sectionKey = inferSectionKey(block, index);
      if (!sectionUsesBullets(sectionKey, format)) return block;

      const items = splitIntoBulletItems(block, sectionKey);
      if (items.length <= 1) return block;
      return items.map((item) => `• ${item}`).join('\n');
    })
    .join('\n\n');
}

function inferSectionKey(block: string, index: number): string {
  const lower = block.toLowerCase();
  if (lower.includes('achievement') || lower.includes('impact')) return 'achievements';
  if (lower.includes('experience') || lower.includes('role at')) return 'experience';
  if (lower.includes('skill')) return 'skills';
  if (lower.includes('education') || lower.includes('degree')) return 'education';
  if (index === 0) return 'summary';
  return 'experience';
}
