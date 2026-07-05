import type { User } from '@supabase/supabase-js';
import type { UserProfile } from '@/lib/userProfile';

const LINKEDIN_PROVIDERS = new Set(['linkedin_oidc', 'linkedin']);
const LINKEDIN_USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';
const LINKEDIN_IDENTITY_ME_URL = 'https://api.linkedin.com/rest/identityMe';
const LINKEDIN_API_VERSION = process.env.LINKEDIN_API_VERSION ?? '202510.03';

export type LinkedInImportResult = {
  connected: boolean;
  fields: Partial<UserProfile>;
  memberId?: string;
};

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function buildFullName(meta: Record<string, unknown>): string {
  const fullName = readString(meta.full_name) || readString(meta.name);
  if (fullName) return fullName;

  const given = readString(meta.given_name);
  const family = readString(meta.family_name);
  return [given, family].filter(Boolean).join(' ');
}

function extractAvatarUrl(meta: Record<string, unknown>): string {
  const picture = meta.picture;
  if (typeof picture === 'string' && picture.startsWith('https://')) return picture.trim();
  if (picture && typeof picture === 'object') {
    const data = picture as Record<string, unknown>;
    const nested = readString(data.url) || readString(data.displayImage);
    if (nested.startsWith('https://')) return nested;
  }

  const candidates = [readString(meta.avatar_url), readString(meta.profile_picture), readString(meta.picture_url)];
  for (const candidate of candidates) {
    if (candidate.startsWith('https://')) return candidate;
  }

  return '';
}

function extractLinkedInUrl(meta: Record<string, unknown>): string {
  const candidates = [
    readString(meta.profile),
    readString(meta.public_profile_url),
    readString(meta.linkedin_url),
    readString(meta.profile_url),
  ];

  for (const candidate of candidates) {
    if (candidate.includes('linkedin.com')) return candidate;
  }

  const vanity = readString(meta.vanityName) || readString(meta.preferred_username);
  if (vanity && !vanity.includes('/')) {
    return `https://www.linkedin.com/in/${vanity.replace(/^@/, '')}`;
  }

  return '';
}

function extractHeadline(meta: Record<string, unknown>): string {
  const candidates = [
    readString(meta.headline),
    readString(meta.localizedHeadline),
    readString(meta.job_title),
    readString(meta.title),
    readString(meta.occupation),
    readString(meta.position),
  ];

  for (const candidate of candidates) {
    if (candidate) return candidate;
  }

  return '';
}

function extractLocation(meta: Record<string, unknown>): string {
  const direct = [
    readString(meta.location),
    readString(meta.localizedLocation),
    readString(meta.geoLocation),
    readString(meta.city),
  ];

  for (const candidate of direct) {
    if (candidate) return candidate;
  }

  // LinkedIn OIDC `locale` (e.g. en_US) is language preference, not where someone lives.
  return '';
}

export function getLinkedInIdentity(user: User) {
  return user.identities?.find((identity) => LINKEDIN_PROVIDERS.has(identity.provider));
}

function userHasLinkedInProvider(user: User): boolean {
  if (getLinkedInIdentity(user)) return true;
  if (user.app_metadata?.provider && LINKEDIN_PROVIDERS.has(user.app_metadata.provider)) return true;

  const providers = user.app_metadata?.providers;
  if (Array.isArray(providers)) {
    return providers.some((provider) => typeof provider === 'string' && LINKEDIN_PROVIDERS.has(provider));
  }

  return false;
}

function collectLinkedInMetadata(user: User, extraMeta?: Record<string, unknown>): Record<string, unknown> {
  const meta: Record<string, unknown> = {
    ...(user.user_metadata ?? {}),
  };

  for (const identity of user.identities ?? []) {
    if (!LINKEDIN_PROVIDERS.has(identity.provider)) continue;
    Object.assign(meta, identity.identity_data ?? {});
  }

  if (extraMeta) Object.assign(meta, extraMeta);

  return meta;
}

function buildImportFields(meta: Record<string, unknown>, user: User, identity?: ReturnType<typeof getLinkedInIdentity>) {
  const fullName = buildFullName(meta);
  const email = readString(meta.email) || readString(user.email);
  const headline = extractHeadline(meta);
  const linkedinUrl = extractLinkedInUrl(meta);
  const avatarUrl = extractAvatarUrl(meta);
  const location = extractLocation(meta);
  const memberId = readString(meta.sub) || readString(meta.provider_id) || readString(identity?.id);

  const fields: Partial<UserProfile> = {};
  if (fullName) fields.fullName = fullName;
  if (email) fields.email = email;
  if (headline) fields.headline = headline;
  if (linkedinUrl) fields.linkedinUrl = linkedinUrl;
  if (avatarUrl) fields.avatarUrl = avatarUrl;
  if (location) fields.location = location;

  return { fields, memberId: memberId || undefined };
}

export function extractLinkedInProfile(
  user: User,
  extraMeta?: Record<string, unknown>
): LinkedInImportResult {
  if (!userHasLinkedInProvider(user)) {
    return { connected: false, fields: {} };
  }

  const identity = getLinkedInIdentity(user);
  const meta = collectLinkedInMetadata(user, extraMeta);
  const { fields, memberId } = buildImportFields(meta, user, identity);

  return {
    connected: true,
    fields,
    memberId,
  };
}

function readMultiLocaleString(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (!value || typeof value !== 'object') return '';

  const obj = value as Record<string, unknown>;
  const localized = obj.localized;
  if (localized && typeof localized === 'object') {
    for (const entry of Object.values(localized as Record<string, unknown>)) {
      const text = readString(entry);
      if (text) return text;
    }
  }

  return readString(obj.localizedHeadline);
}

export function mapIdentityMeToMetadata(data: Record<string, unknown>): Record<string, unknown> {
  const meta: Record<string, unknown> = {};
  const basicInfo = data.basicInfo as Record<string, unknown> | undefined;
  if (!basicInfo) return meta;

  const firstName = readMultiLocaleString(basicInfo.firstName);
  const lastName = readMultiLocaleString(basicInfo.lastName);
  const fullName = [firstName, lastName].filter(Boolean).join(' ');
  if (fullName) meta.name = fullName;
  if (firstName) meta.given_name = firstName;
  if (lastName) meta.family_name = lastName;

  const email = readString(basicInfo.primaryEmailAddress);
  if (email) meta.email = email;

  const profileUrl = readString(basicInfo.profileUrl);
  if (profileUrl) meta.profile_url = profileUrl;

  const headline =
    readString(basicInfo.headline) ||
    readMultiLocaleString(basicInfo.headline) ||
    readString(basicInfo.localizedHeadline);
  if (headline) meta.headline = headline;

  const profilePicture = basicInfo.profilePicture as Record<string, unknown> | undefined;
  const cropped = profilePicture?.croppedImage as Record<string, unknown> | undefined;
  const downloadUrl = readString(cropped?.downloadUrl);
  if (downloadUrl) meta.picture = downloadUrl;

  const position = data.primaryCurrentPosition as Record<string, unknown> | undefined;
  if (position) {
    const title = readMultiLocaleString(position.title);
    const company = readMultiLocaleString(position.companyName);
    if (!meta.headline) {
      if (title && company) meta.headline = `${title} at ${company}`;
      else if (title) meta.headline = title;
    }
  }

  const memberId = readString(data.id);
  if (memberId) meta.sub = memberId;

  return meta;
}

/** Fetch live OIDC claims from LinkedIn when the session still has a provider token. */
export async function fetchLinkedInUserInfo(
  providerToken: string
): Promise<Record<string, unknown> | null> {
  const token = providerToken.trim();
  if (!token) return null;

  try {
    const response = await fetch(LINKEDIN_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export async function fetchLinkedInIdentityMe(
  providerToken: string
): Promise<Record<string, unknown> | null> {
  const token = providerToken.trim();
  if (!token) return null;

  try {
    const response = await fetch(LINKEDIN_IDENTITY_ME_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'LinkedIn-Version': LINKEDIN_API_VERSION,
      },
      cache: 'no-store',
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export async function extractLinkedInProfileWithUserInfo(
  user: User,
  providerToken?: string | null
): Promise<LinkedInImportResult> {
  let extraMeta: Record<string, unknown> | undefined;

  if (providerToken) {
    extraMeta = {};
    const [userInfo, identityMe] = await Promise.all([
      fetchLinkedInUserInfo(providerToken),
      fetchLinkedInIdentityMe(providerToken),
    ]);
    if (userInfo) Object.assign(extraMeta, userInfo);
    if (identityMe) Object.assign(extraMeta, mapIdentityMeToMetadata(identityMe));
    if (Object.keys(extraMeta).length === 0) extraMeta = undefined;
  }

  return extractLinkedInProfile(user, extraMeta);
}

export function mergeLinkedInIntoProfile(current: UserProfile, imported: Partial<UserProfile>): UserProfile {
  return {
    ...current,
    fullName: imported.fullName?.trim() || current.fullName,
    email: current.email || imported.email || '',
    phone: current.phone || imported.phone || '',
    location: current.location,
    headline: imported.headline?.trim() || current.headline,
    linkedinUrl: imported.linkedinUrl?.trim() || current.linkedinUrl,
    avatarUrl: imported.avatarUrl?.trim() || current.avatarUrl || '',
  };
}

export function describeImportedLinkedInFields(fields: Partial<UserProfile>): string {
  const labels: string[] = [];
  if (fields.fullName) labels.push('name');
  if (fields.email) labels.push('email');
  if (fields.headline) labels.push('headline');
  if (fields.linkedinUrl) labels.push('LinkedIn URL');
  if (fields.avatarUrl) labels.push('photo');
  return labels.join(', ');
}
