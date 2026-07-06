import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { requireAuthUser } from '@/lib/apiAuth';
import type { UserProfile } from '@/lib/userProfile';

const MAX_FIELD_LENGTH = 200;

function trimField(value: unknown, max = MAX_FIELD_LENGTH): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function rowToProfile(row: Record<string, unknown>, emailFallback: string): UserProfile {
  return {
    fullName: trimField(row.full_name),
    email: trimField(row.email) || emailFallback,
    phone: trimField(row.phone),
    location: trimField(row.location),
    headline: trimField(row.headline),
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

function parseProfileBody(body: unknown): Partial<UserProfile> | null {
  if (!body || typeof body !== 'object') return null;
  const data = body as Record<string, unknown>;
  return {
    fullName: trimField(data.fullName),
    phone: trimField(data.phone),
    location: trimField(data.location),
    headline: trimField(data.headline),
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let { data, error } = await auth.db
    .from('profiles')
    .select('email, full_name, phone, location, headline, profile_updated_at, studio_setup_completed_at')
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
      .select('email, full_name, phone, location, headline, profile_updated_at, studio_setup_completed_at')
      .single();
    if (updated) data = updated;
  }

  return NextResponse.json({
    profile: rowToProfile(data, auth.user.email ?? ''),
    updatedAt: data.profile_updated_at ?? null,
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

  const patch: Record<string, string | null> = {
    full_name: updates.fullName ?? '',
    phone: updates.phone ?? '',
    location: updates.location ?? '',
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
    .select('email, full_name, phone, location, headline, profile_updated_at, studio_setup_completed_at')
    .single();

  if (error) return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });

  return NextResponse.json({
    profile: rowToProfile(data, auth.user.email ?? ''),
    updatedAt: data.profile_updated_at ?? null,
  });
}
