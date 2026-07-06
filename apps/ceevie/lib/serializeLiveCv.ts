import type { CvPreviewDocument } from '@/lib/cvPreviewDocument';
import type { UserProfile } from '@/lib/userProfile';
import { normalizeUserProfile } from '@/lib/userProfile';

export function serializeLiveCvForCopy(document: CvPreviewDocument, profile?: UserProfile | null): string {
  const lines: string[] = [];
  const safe = normalizeUserProfile(profile);

  if (document.fullName.trim()) lines.push(document.fullName.trim());
  if (document.targetRole.trim()) lines.push(document.targetRole.trim());

  const contactParts = [safe.email, safe.phone, safe.location, safe.linkedinUrl, safe.portfolioUrl].filter(Boolean);
  if (contactParts.length) lines.push(contactParts.join(' · '));

  if (document.recentRole.trim()) {
    lines.push('');
    lines.push(document.recentRole.trim());
  }

  for (const section of document.sections) {
    const value = section.value.trim();
    if (!value) continue;
    lines.push('');
    lines.push(section.label.trim());
    lines.push(value);
  }

  return lines.join('\n').trim();
}
