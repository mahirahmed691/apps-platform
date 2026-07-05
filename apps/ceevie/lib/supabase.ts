import { createSupabaseBrowser } from '@yourorg/app-core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseConfigured } from '@/lib/env';

let client: SupabaseClient | undefined;
let clientKey: string | undefined;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const key = `${url}:${anonKey}`;

  // Recreate client when env changes (e.g. after fill-env) — stale singleton
  // otherwise keeps talking to the wrong Supabase project until hard restart.
  if (client && clientKey === key) return client;

  client = createSupabaseBrowser(url, anonKey);
  clientKey = key;
  return client;
}

export function getSupabaseProjectRef(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  return match?.[1] ?? null;
}
