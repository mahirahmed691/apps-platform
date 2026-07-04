import type { SupabaseClient } from '@supabase/supabase-js';

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class GenerationDisabledError extends Error {
  constructor() {
    super('AI generation is currently disabled.');
    this.name = 'GenerationDisabledError';
  }
}

export async function checkAndIncrement(db: SupabaseClient, userId: string, plan: string) {
  const { data: config } = await db
    .from('app_config')
    .select('value')
    .eq('key', 'ai_generation_enabled')
    .single();

  if (config?.value === false || config?.value === 'false') {
    throw new GenerationDisabledError();
  }

  const limitKey = plan === 'active' ? 'paid_tier_daily_requests' : 'free_tier_daily_requests';
  const { data: limitConfig } = await db
    .from('app_config')
    .select('value')
    .eq('key', limitKey)
    .single();

  const dailyLimit = Number(limitConfig?.value ?? 5);
  const today = new Date().toISOString().slice(0, 10);

  const { data: existing } = await db
    .from('rate_limits')
    .select('request_count')
    .eq('user_id', userId)
    .eq('day', today)
    .maybeSingle();

  const currentCount = existing?.request_count ?? 0;

  if (currentCount >= dailyLimit) {
    throw new RateLimitError(
      `Daily limit of ${dailyLimit} requests reached. Try again tomorrow or upgrade.`
    );
  }

  await db
    .from('rate_limits')
    .upsert(
      { user_id: userId, day: today, request_count: currentCount + 1 },
      { onConflict: 'user_id,day' }
    );

  return { remaining: dailyLimit - currentCount - 1 };
}
