import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/apiAuth';
import { looksLikeLocaleOnlyLocation, sanitizeProfileForSetup, type UserProfile } from '@/lib/userProfile';

const MAX_FIELD_LENGTH = 200;
const MAX_URL_LENGTH = 500;

function trimField(value: unknown, max = MAX_FIELD_LENGTH): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function normalizeUrl(value: string): string {
  if (!value) return '';
  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return parsed.toString().slice(0, MAX_URL_LENGTH);
  } catch {
    return '';
  }
}

function rowToProfile(row: Record<string, unknown>, emailFallback: string): UserProfile {
  return {
    fullName: trimField(row.full_name),
    email: trimField(row.email) || emailFallback,
    phone: trimField(row.phone),
    location: trimField(row.location),
    linkedinUrl: trimField(row.linkedin_url, MAX_URL_LENGTH),
    portfolioUrl: trimField(row.portfolio_url, MAX_URL_LENGTH),
    headline: trimField(row.headline),
    avatarUrl: normalizeUrl(trimField(row.avatar_url, MAX_URL_LENGTH)),
    linkedinConnectedAt:
      typeof row.linkedin_connected_at === 'string' ? row.linkedin_connected_at : null,
  };
}

function parseProfileBody(body: unknown): Partial<UserProfile> | null {
  if (!body || typeof body !== 'object') return null;
  const data = body as Record<string, unknown>;
  return {
    fullName: trimField(data.fullName),
    phone: trimField(data.phone),
    location: trimField(data.location),
    linkedinUrl: normalizeUrl(trimField(data.linkedinUrl, MAX_URL_LENGTH)),
    portfolioUrl: normalizeUrl(trimField(data.portfolioUrl, MAX_URL_LENGTH)),
    headline: trimField(data.headline),
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await auth.db
    .from('profiles')
    .select(
      'email, full_name, phone, location, linkedin_url, portfolio_url, headline, avatar_url, profile_updated_at, linkedin_connected_at'
    )
    .eq('id', auth.user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });
  if (!data) return NextResponse.json({ profile: null });

  const rawProfile = rowToProfile(data, auth.user.email ?? '');
  const profile = sanitizeProfileForSetup(rawProfile);

  if (rawProfile.location !== profile.location) {
    await auth.db
      .from('profiles')
      .update({ location: profile.location, profile_updated_at: new Date().toISOString() })
      .eq('id', auth.user.id);
  }

  return NextResponse.json({
    profile,
    updatedAt: data.profile_updated_at ?? null,
    linkedinConnectedAt: data.linkedin_connected_at ?? null,
  });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const updates = parseProfileBody(body);
  if (!updates) return NextResponse.json({ error: 'Invalid profile payload' }, { status: 400 });

  const location =
    updates.location && looksLikeLocaleOnlyLocation(updates.location) ? '' : (updates.location ?? '');

  const { data, error } = await auth.db
    .from('profiles')
    .update({
      full_name: updates.fullName ?? '',
      phone: updates.phone ?? '',
      location,
      linkedin_url: updates.linkedinUrl ?? '',
      portfolio_url: updates.portfolioUrl ?? '',
      headline: updates.headline ?? '',
      profile_updated_at: new Date().toISOString(),
    })
    .eq('id', auth.user.id)
    .select('email, full_name, phone, location, linkedin_url, portfolio_url, headline, profile_updated_at')
    .single();

  if (error) return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });

  return NextResponse.json({
    profile: rowToProfile(data, auth.user.email ?? ''),
    updatedAt: data.profile_updated_at ?? null,
  });
}
