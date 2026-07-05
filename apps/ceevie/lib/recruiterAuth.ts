import type { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';

export type RecruiterProfile = {
  accountType: 'candidate' | 'recruiter';
  email: string | null;
  fullName: string | null;
};

export async function getRecruiterProfile(
  db: SupabaseClient,
  userId: string
): Promise<RecruiterProfile | null> {
  const { data, error } = await db
    .from('profiles')
    .select('account_type, email, full_name')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    accountType: data.account_type === 'recruiter' ? 'recruiter' : 'candidate',
    email: typeof data.email === 'string' ? data.email : null,
    fullName: typeof data.full_name === 'string' ? data.full_name : null,
  };
}

export async function requireRecruiter(
  db: SupabaseClient,
  user: User
): Promise<{ ok: true; profile: RecruiterProfile } | { ok: false; status: number; message: string }> {
  const profile = await getRecruiterProfile(db, user.id);
  if (!profile) return { ok: false, status: 500, message: 'Failed to load profile' };
  if (profile.accountType !== 'recruiter') {
    return { ok: false, status: 403, message: 'Recruiter account required' };
  }
  return { ok: true, profile };
}
