import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Permanently deletes a user from Supabase Auth. Profile and app data rows
 * cascade via foreign keys (profiles.id → auth.users.id on delete cascade).
 */
export async function deleteUserAccount(db: SupabaseClient, userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await db.auth.admin.deleteUser(userId);
  if (error) {
    return { ok: false, error: error.message || 'Failed to delete account' };
  }
  return { ok: true };
}
