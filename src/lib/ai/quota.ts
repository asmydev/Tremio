import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Vrai si l'utilisateur a encore des générations disponibles sur les dernières 24 h. */
export async function hasQuota(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const limit = Number(process.env.AI_DAILY_LIMIT ?? 60);
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await supabase.from('ai_runs').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', since);
  return (count ?? 0) < limit;
}

export async function logRun(supabase: SupabaseClient, row: { user_id: string; template_id: string; model: string; input_tokens?: number; output_tokens?: number }) {
  const { error } = await supabase.from('ai_runs').insert({ ...row, input_tokens: row.input_tokens ?? null, output_tokens: row.output_tokens ?? null });
  if (error) console.error('[ai] journal ai_runs', error.message);
}
