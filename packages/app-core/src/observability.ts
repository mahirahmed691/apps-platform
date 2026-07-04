import type { SupabaseClient } from '@supabase/supabase-js';

export function estimateCost(
  inputTokens: number,
  outputTokens: number,
  pricePerMInput = 3.0,
  pricePerMOutput = 15.0
): number {
  return (inputTokens / 1_000_000) * pricePerMInput + (outputTokens / 1_000_000) * pricePerMOutput;
}

export async function logUsageEvent(
  db: SupabaseClient,
  params: {
    userId: string;
    feature: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    status: 'success' | 'error' | 'timeout' | 'rate_limited';
    errorDetail?: string;
  }
) {
  const cost = estimateCost(params.inputTokens, params.outputTokens);

  console.log(
    JSON.stringify({ type: 'usage_event', ...params, estimatedCostUsd: cost, timestamp: new Date().toISOString() })
  );

  await db.from('usage_events').insert({
    user_id: params.userId,
    feature: params.feature,
    input_tokens: params.inputTokens,
    output_tokens: params.outputTokens,
    estimated_cost_usd: cost,
    latency_ms: params.latencyMs,
    status: params.status,
    error_detail: params.errorDetail ?? null,
  });

  checkDailySpendAlert(db).catch((e) => console.error('spend alert check failed', e));
}

async function checkDailySpendAlert(db: SupabaseClient) {
  const { data: thresholdConfig } = await db
    .from('app_config')
    .select('value')
    .eq('key', 'daily_spend_alert_usd')
    .single();
  const threshold = Number(thresholdConfig?.value ?? 5);

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const { data: rows } = await db
    .from('usage_events')
    .select('estimated_cost_usd')
    .gte('created_at', startOfDay.toISOString());

  const total = (rows ?? []).reduce((sum, r) => sum + Number(r.estimated_cost_usd), 0);

  if (total >= threshold) {
    console.error(
      JSON.stringify({
        type: 'spend_alert',
        totalUsdToday: total,
        threshold,
        message: 'Daily AI spend threshold exceeded — consider the kill switch.',
      })
    );
  }
}
