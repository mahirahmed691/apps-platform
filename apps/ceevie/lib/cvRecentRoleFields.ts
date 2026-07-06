export type CvRecentRoleFields = {
  title: string;
  company: string;
  dates: string;
  duties: string;
};

function extractLabel(value: string, label: string): string {
  const match = value.match(new RegExp(`${label}:\\s*([^|]+)`, 'i'));
  return match?.[1]?.trim() ?? '';
}

export function parseRecentRoleFields(value: string): CvRecentRoleFields {
  const raw = value.trim();
  if (!raw) {
    return { title: '', company: '', dates: '', duties: '' };
  }

  if (/title:|company:|duties:|dates:/i.test(raw)) {
    return {
      title: extractLabel(raw, 'title'),
      company: extractLabel(raw, 'company'),
      dates: extractLabel(raw, 'dates'),
      duties: extractLabel(raw, 'duties'),
    };
  }

  const atMatch = raw.match(/^(.+?)\s+at\s+(.+?)(?:[,.]\s*|\s+-\s+|\s+\(|\s*$)/i);
  if (atMatch) {
    const remainder = raw.slice(atMatch[0].length).trim();
    const datesMatch = raw.match(/\(([^)]+)\)/);
    return {
      title: atMatch[1].trim(),
      company: atMatch[2].replace(/\([^)]+\)/, '').trim(),
      dates: datesMatch?.[1]?.trim() ?? '',
      duties: remainder.replace(/\([^)]+\)/, '').trim(),
    };
  }

  return { title: '', company: '', dates: '', duties: raw };
}

export function serializeRecentRoleFields(fields: CvRecentRoleFields): string {
  const title = fields.title.trim();
  const company = fields.company.trim();
  const dates = fields.dates.trim();
  const duties = fields.duties.trim();

  if (title || company || dates || duties) {
    return [
      title ? `title: ${title}` : '',
      company ? `company: ${company}` : '',
      dates ? `dates: ${dates}` : '',
      duties ? `duties: ${duties}` : '',
    ]
      .filter(Boolean)
      .join(' | ');
  }

  return '';
}
