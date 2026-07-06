import type { CvPreviewDocument, CvPreviewSection, PreviewSectionKey } from '@/lib/cvPreviewDocument';

const SECTION_HEADERS: Array<{ key: PreviewSectionKey; patterns: RegExp[] }> = [
  { key: 'summary', patterns: [/^(professional\s+)?summary$/i, /^profile$/i, /^about$/i] },
  { key: 'achievements', patterns: [/^(key\s+)?achievements$/i, /^highlights$/i] },
  { key: 'experience', patterns: [/^(work\s+)?experience$/i, /^employment$/i, /^career\s+history$/i] },
  { key: 'skills', patterns: [/^(core\s+)?skills$/i, /^technical\s+skills$/i, /^competencies$/i] },
  { key: 'education', patterns: [/^education$/i, /^qualifications$/i, /^training$/i] },
  { key: 'extras', patterns: [/^(additional(\s+information)?|extras?)$/i, /^certifications?$/i] },
];

type ParseFallback = {
  fullName?: string;
  targetRole?: string;
  recentRole?: string;
};

export function parseGeneratedCvDocument(text: string, fallback: ParseFallback = {}): CvPreviewDocument {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      fullName: fallback.fullName?.trim() ?? '',
      targetRole: fallback.targetRole?.trim() ?? '',
      recentRole: fallback.recentRole?.trim() ?? '',
      sections: [],
    };
  }

  const lines = trimmed.split('\n');
  const blocks: Array<{ header: string | null; lines: string[] }> = [];
  let current: { header: string | null; lines: string[] } = { header: null, lines: [] };

  for (const line of lines) {
    const value = line.trim();
    if (!value) {
      if (current.lines.length) {
        blocks.push(current);
        current = { header: null, lines: [] };
      }
      continue;
    }

    const sectionKey = matchSectionHeader(value);
    if (sectionKey && current.lines.length === 0 && current.header === null) {
      current.header = value;
      current.lines.push(`__section__:${sectionKey}`);
      continue;
    }

    if (sectionKey && (current.lines.length > 0 || current.header)) {
      blocks.push(current);
      current = { header: value, lines: [`__section__:${sectionKey}`] };
      continue;
    }

    current.lines.push(value);
  }

  if (current.lines.length) blocks.push(current);

  let fullName = fallback.fullName?.trim() ?? '';
  let targetRole = fallback.targetRole?.trim() ?? '';
  let recentRole = fallback.recentRole?.trim() ?? '';
  const sections: CvPreviewSection[] = [];

  if (blocks.length === 0) {
    return {
      fullName,
      targetRole,
      recentRole,
      sections: [{ key: 'summary', label: 'Professional summary', value: trimmed, generated: false }],
    };
  }

  const firstBlock = blocks[0];
  const firstSectionMarker = firstBlock.lines.find((line) => line.startsWith('__section__:'));
  if (!firstSectionMarker && firstBlock.lines.length) {
    fullName = fullName || firstBlock.lines[0];
    if (firstBlock.lines.length > 1 && !targetRole) {
      targetRole = firstBlock.lines[1];
    }
    if (firstBlock.lines.length > 2 && !recentRole) {
      recentRole = firstBlock.lines.slice(2).join('\n');
    }
    blocks.shift();
  }

  for (const block of blocks) {
    const marker = block.lines.find((line) => line.startsWith('__section__:'));
    const key = marker ? (marker.replace('__section__:', '') as PreviewSectionKey) : inferSectionFromHeader(block.header);
    const content = block.lines.filter((line) => !line.startsWith('__section__:')).join('\n').trim();
    if (!content) continue;

    sections.push({
      key,
      label: block.header ?? formatSectionLabel(key),
      value: content,
      generated: false,
    });
  }

  if (sections.length === 0 && trimmed) {
    sections.push({
      key: 'summary',
      label: 'Professional summary',
      value: trimmed,
      generated: false,
    });
  }

  return { fullName, targetRole, recentRole, sections };
}

function matchSectionHeader(line: string): PreviewSectionKey | null {
  const normalized = line.replace(/^#+\s*/, '').trim();
  for (const entry of SECTION_HEADERS) {
    if (entry.patterns.some((pattern) => pattern.test(normalized))) return entry.key;
  }
  return null;
}

function inferSectionFromHeader(header: string | null): PreviewSectionKey {
  if (!header) return 'experience';
  return matchSectionHeader(header) ?? 'experience';
}

function formatSectionLabel(key: PreviewSectionKey): string {
  if (key === 'summary') return 'Professional summary';
  if (key === 'achievements') return 'Key achievements';
  if (key === 'extras') return 'Additional';
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export function serializeCvPreviewDocument(document: CvPreviewDocument): string {
  const lines: string[] = [];

  if (document.fullName.trim()) lines.push(document.fullName.trim());
  if (document.targetRole.trim()) lines.push(document.targetRole.trim());
  if (document.recentRole.trim()) lines.push(document.recentRole.trim());

  for (const section of document.sections) {
    const value = section.value.trim();
    if (!value) continue;
    if (lines.length > 0) lines.push('');
    lines.push(section.label.trim());
    lines.push(value);
  }

  return lines.join('\n').trim();
}
