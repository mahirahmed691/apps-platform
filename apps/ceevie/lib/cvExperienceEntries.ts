export type CvExperienceEntry = {
  id: string;
  title: string;
  company: string;
  dates: string;
  details: string;
};

function entryIdFromIndex(index: number): string {
  return `exp-${index}`;
}

function emptyEntry(index = 0): CvExperienceEntry {
  return { id: entryIdFromIndex(index), title: '', company: '', dates: '', details: '' };
}

function extractPipeField(value: string, label: string): string {
  const match = value.match(new RegExp(`${label}:\\s*([^|]+)`, 'i'));
  return match?.[1]?.trim() ?? '';
}

function parseRoleLine(line: string): Omit<CvExperienceEntry, 'id'> | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  let match = trimmed.match(/^(.+?)\s*,\s*(.+?)\s*\|\s*(.+)$/);
  if (match) {
    return { title: match[1].trim(), company: match[2].trim(), dates: match[3].trim(), details: '' };
  }

  match = trimmed.match(/^(.+?)\s+at\s+(.+?)\s*\(([^)]+)\)\s*$/i);
  if (match) {
    return { title: match[1].trim(), company: match[2].trim(), dates: match[3].trim(), details: '' };
  }

  match = trimmed.match(/^(.+?)\s*\|\s*(.+?)\s*\|\s*(.+)$/);
  if (match) {
    return { title: match[1].trim(), company: match[2].trim(), dates: match[3].trim(), details: '' };
  }

  match = trimmed.match(/^(.+?)\s*[—–-]\s*(.+?)\s*[—–-]\s*(.+)$/);
  if (match) {
    return { title: match[1].trim(), company: match[2].trim(), dates: match[3].trim(), details: '' };
  }

  if (/title:|company:|duties:/i.test(trimmed)) {
    return {
      title: extractPipeField(trimmed, 'title'),
      company: extractPipeField(trimmed, 'company'),
      dates: extractPipeField(trimmed, 'dates') || extractPipeField(trimmed, 'period'),
      details: extractPipeField(trimmed, 'duties'),
    };
  }

  return null;
}

function parseBlock(block: string, index: number): CvExperienceEntry {
  const lines = block.split('\n');
  const firstLine = lines[0]?.trim() ?? '';
  const rest = lines
    .slice(1)
    .map((line) => line.trim().replace(/^[-•*]\s*/, ''))
    .filter(Boolean)
    .join('\n')
    .trim();

  const parsed = parseRoleLine(firstLine);
  if (parsed) {
    return {
      id: entryIdFromIndex(index),
      title: parsed.title,
      company: parsed.company,
      dates: parsed.dates,
      details: rest || parsed.details,
    };
  }

  if (lines.length === 1) {
    return { id: entryIdFromIndex(index), title: '', company: '', dates: '', details: firstLine };
  }

  return { id: entryIdFromIndex(index), title: firstLine, company: '', dates: '', details: rest };
}

export function parseExperienceEntries(text: string): CvExperienceEntry[] {
  const trimmed = text.trim();
  if (!trimmed) return [emptyEntry(0)];

  const blocks = trimmed.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  if (blocks.length === 0) return [emptyEntry(0)];

  return blocks.map((block, index) => parseBlock(block, index));
}

function serializeEntry(entry: CvExperienceEntry): string {
  const title = entry.title.trim();
  const company = entry.company.trim();
  const dates = entry.dates.trim();
  const details = entry.details.trim();

  let header = '';
  if (title && company) {
    header = dates ? `${title}, ${company} | ${dates}` : `${title}, ${company}`;
  } else if (title) {
    header = dates ? `${title} | ${dates}` : title;
  } else if (company) {
    header = dates ? `${company} | ${dates}` : company;
  } else {
    header = dates;
  }

  if (header && details) return `${header}\n${details}`;
  if (header) return header;
  return details;
}

export function serializeExperienceEntries(entries: CvExperienceEntry[]): string {
  return entries
    .map(serializeEntry)
    .map((block) => block.trim())
    .filter(Boolean)
    .join('\n\n');
}

export function createExperienceEntry(index: number): CvExperienceEntry {
  return emptyEntry(index);
}
