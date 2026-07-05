import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/apiAuth';
import {
  describeImportedLinkedInFields,
  extractLinkedInProfileWithUserInfo,
  mergeLinkedInIntoProfile,
} from '@/lib/linkedinProfile';
import { looksLikeLocaleOnlyLocation, type UserProfile } from '@/lib/userProfile';

function rowToProfile(row: Record<string, unknown>, emailFallback: string): UserProfile {
  return {
    fullName: typeof row.full_name === 'string' ? row.full_name.trim() : '',
    email: (typeof row.email === 'string' ? row.email.trim() : '') || emailFallback,
    phone: typeof row.phone === 'string' ? row.phone.trim() : '',
    location: typeof row.location === 'string' ? row.location.trim() : '',
    linkedinUrl: typeof row.linkedin_url === 'string' ? row.linkedin_url.trim() : '',
    portfolioUrl: typeof row.portfolio_url === 'string' ? row.portfolio_url.trim() : '',
    headline: typeof row.headline === 'string' ? row.headline.trim() : '',
    avatarUrl: typeof row.avatar_url === 'string' ? row.avatar_url.trim() : '',
    linkedinConnectedAt:
      typeof row.linkedin_connected_at === 'string' ? row.linkedin_connected_at : null,
  };
}

function buildImportMessage(fields: Partial<UserProfile>): string {
  const summary = describeImportedLinkedInFields(fields);
  if (summary) {
    return `LinkedIn connected. Imported ${summary}. Use the voice interview for experience and achievements.`;
  }
  return 'LinkedIn connected. Re-connect if headline or profile URL are still missing — new scopes require a fresh authorization.';
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? '';
  const { data: userData, error: userError } = await auth.db.auth.getUser(token);
  if (userError || !userData.user) {
    return NextResponse.json({ error: 'Could not read your session' }, { status: 401 });
  }

  const { data: adminData, error: adminError } = await auth.db.auth.admin.getUserById(auth.user.id);
  const userForExtract = adminError || !adminData.user ? userData.user : adminData.user;

  let providerToken: string | null = null;
  try {
    const body = await req.json();
    if (body && typeof body === 'object' && typeof (body as Record<string, unknown>).providerToken === 'string') {
      providerToken = ((body as Record<string, unknown>).providerToken as string).trim() || null;
    }
  } catch {
    // Body is optional for sync requests.
  }

  let extracted = await extractLinkedInProfileWithUserInfo(userForExtract, providerToken);
  if (!extracted.connected) {
    extracted = await extractLinkedInProfileWithUserInfo(userData.user, providerToken);
  }
  if (!extracted.connected) {
    return NextResponse.json(
      {
        error: 'LinkedIn is not connected yet. Use Connect LinkedIn and approve access first.',
      },
      { status: 400 }
    );
  }

  const { data: existing, error: loadError } = await auth.db
    .from('profiles')
    .select(
      'email, full_name, phone, location, linkedin_url, portfolio_url, headline, avatar_url, linkedin_connected_at'
    )
    .eq('id', auth.user.id)
    .maybeSingle();

  if (loadError) return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });

  const current = existing
    ? rowToProfile(existing, auth.user.email ?? '')
    : {
        fullName: '',
        email: auth.user.email ?? '',
        phone: '',
        location: '',
        linkedinUrl: '',
        portfolioUrl: '',
        headline: '',
        avatarUrl: '',
      };

  const merged = mergeLinkedInIntoProfile(current, extracted.fields);
  if (looksLikeLocaleOnlyLocation(merged.location)) {
    merged.location = current.location && !looksLikeLocaleOnlyLocation(current.location) ? current.location : '';
  }
  const now = new Date().toISOString();
  const linkedInConnectedAt =
    typeof existing?.linkedin_connected_at === 'string' ? existing.linkedin_connected_at : now;

  const { data, error } = await auth.db
    .from('profiles')
    .upsert(
      {
        id: auth.user.id,
        email: merged.email || auth.user.email || '',
        full_name: merged.fullName,
        phone: merged.phone,
        location: merged.location,
        linkedin_url: merged.linkedinUrl,
        portfolio_url: merged.portfolioUrl,
        headline: merged.headline,
        avatar_url: merged.avatarUrl || null,
        linkedin_member_id: extracted.memberId ?? null,
        linkedin_connected_at: linkedInConnectedAt,
        profile_updated_at: now,
      },
      { onConflict: 'id' }
    )
    .select(
      'email, full_name, phone, location, linkedin_url, portfolio_url, headline, avatar_url, linkedin_connected_at, profile_updated_at'
    )
    .single();

  if (error) return NextResponse.json({ error: 'Failed to save LinkedIn import' }, { status: 500 });

  return NextResponse.json({
    profile: rowToProfile(data, auth.user.email ?? ''),
    importedFields: Object.keys(extracted.fields),
    importedSummary: describeImportedLinkedInFields(extracted.fields),
    linkedinConnectedAt: data.linkedin_connected_at ?? null,
    message: buildImportMessage(extracted.fields),
  });
}
