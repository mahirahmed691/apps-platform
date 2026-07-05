import { NextRequest } from 'next/server';
import { createSupabaseServer } from '@yourorg/app-core';
import type { SupabaseClient, User } from '@supabase/supabase-js';

export type AuthContext = {
  db: SupabaseClient;
  user: User;
};

export async function requireAuthUser(req: NextRequest): Promise<AuthContext | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;

  const db = createSupabaseServer(url, serviceRoleKey);
  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;

  return { db, user: data.user };
}
