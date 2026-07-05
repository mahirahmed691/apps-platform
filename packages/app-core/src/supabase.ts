import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Every app gets its OWN Supabase project (own data, own billing) —
// this package ships the CODE, not shared infrastructure. That keeps
// blast radius contained: a schema mistake or RLS bug in app #2 can't
// touch app #1's data, because they're different projects entirely.

export function createSupabaseServer(url: string, serviceRoleKey: string): SupabaseClient {
  if (!url || !serviceRoleKey) {
    throw new Error('Missing Supabase URL or service role key.');
  }
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}

export function createSupabaseBrowser(url: string, anonKey: string): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error('Missing Supabase URL or anon key.');
  }
  return createClient(url, anonKey, {
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}
