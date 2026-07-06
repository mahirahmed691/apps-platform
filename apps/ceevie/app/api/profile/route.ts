import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { requireAuthUser } from '@/lib/apiAuth';
import { shouldBackfillStudioSetup } from '@/lib/profileBackfill';
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
    studioSetupCompletedAt:
      typeof row.studio_setup_completed_at === 'string' ? row.studio_setup_completed_at : null,
  };
}

function readAuthDisplayName(user: User): string {
  const meta = user.user_metadata ?? {};
  const fullName =
    (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
    (typeof meta.name === 'string' && meta.name.trim()) ||
    '';
  if (fullName) return fullName.trim();

  const given = typeof meta.given_name === 'string' ? meta.given_name.trim() : '';
  const family = typeof meta.family_name === 'string' ? meta.family_name.trim() : '';
  return [given, family].filter(Boolean).join(' ');
}

async function backfillStudioSetupFromDraft(db: SupabaseClient, userId: string): Promise<string | null> {
  const { data: draft } = await db
    .from('cv_drafts')
    .select('messages, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  const { data: profileRow } = await db
    .from('profiles')
    .select('full_name, headline, location, studio_setup_completed_at')
    .eq('id', userId)
    .maybeSingle();

  if (
    !shouldBackfillStudioSetup({
      studioSetupCompletedAt:
        typeof profileRow?.studio_setup_completed_at === 'string'
          ? profileRow.studio_setup_completed_at
          : null,
      fullName: trimField(profileRow?.full_name),
      headline: trimField(profileRow?.headline),
      location: trimField(profileRow?.location),
      draftMessages: draft?.messages,
    })
  ) {
    return null;
  }

  const completedAt = new Date().toISOString();
  await db
    .from('profiles')
    .update({ studio_setup_completed_at: completedAt })
    .eq('id', userId)
    .is('studio_setup_completed_at', null);

  return completedAt;
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

  let { data, error } = await auth.db
    .from('profiles')
    .select(
      'email, full_name, phone, location, linkedin_url, portfolio_url, headline, avatar_url, profile_updated_at, linkedin_connected_at, studio_setup_completed_at'
    )
    .eq('id', auth.user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });
  if (!data) return NextResponse.json({ profile: null });

  const authName = readAuthDisplayName(auth.user);
  if (!trimField(data.full_name) && authName) {
    const now = new Date().toISOString();
    const { data: updated } = await auth.db
      .from('profiles')
      .update({ full_name: authName, profile_updated_at: now })
      .eq('id', auth.user.id)
      .select(
        'email, full_name, phone, location, linkedin_url, portfolio_url, headline, avatar_url, profile_updated_at, linkedin_connected_at, studio_setup_completed_at'
      )
      .single();
    if (updated) data = updated;
  }

  let studioSetupCompletedAt =
    typeof data.studio_setup_completed_at === 'string' ? data.studio_setup_completed_at : null;
  if (!studioSetupCompletedAt) {
    studioSetupCompletedAt = await backfillStudioSetupFromDraft(auth.db, auth.user.id);
    if (studioSetupCompletedAt) {
      data = { ...data, studio_setup_completed_at: studioSetupCompletedAt };
    }
  }

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

  const completeStudioSetup =
    body && typeof body === 'object' && (body as Record<string, unknown>).completeStudioSetup === true;

  const location =
    updates.location && looksLikeLocaleOnlyLocation(updates.location) ? '' : (updates.location ?? '');

  const patch: Record<string, string | null> = {
    full_name: updates.fullName ?? '',
    phone: updates.phone ?? '',
    location,
    linkedin_url: updates.linkedinUrl ?? '',
    portfolio_url: updates.portfolioUrl ?? '',
    headline: updates.headline ?? '',
    profile_updated_at: new Date().toISOString(),
  };

  if (completeStudioSetup) {
    patch.studio_setup_completed_at = new Date().toISOString();
  }

  const { data, error } = await auth.db
    .from('profiles')
    .update(patch)
    .eq('id', auth.user.id)
    .select(
      'email, full_name, phone, location, linkedin_url, portfolio_url, headline, profile_updated_at, studio_setup_completed_at'
    )
    .single();

  if (error) return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });

  return NextResponse.json({
    profile: rowToProfile(data, auth.user.email ?? ''),
    updatedAt: data.profile_updated_at ?? null,
  });
}
