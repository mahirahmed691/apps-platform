import { NextRequest, NextResponse } from 'next/server';
import { requireAuthUser } from '@/lib/apiAuth';
import { getRecruiterProfile } from '@/lib/recruiterAuth';

export async function GET(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await getRecruiterProfile(auth.db, auth.user.id);
  if (!profile) return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });

  return NextResponse.json({
    accountType: profile.accountType,
    email: profile.email,
    fullName: profile.fullName,
    isRecruiter: profile.accountType === 'recruiter',
  });
}
