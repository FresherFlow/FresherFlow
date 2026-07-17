import { supabase } from '../lib/supabase.js';

export async function startRun(): Promise<string | null> {
  if (!process.env.SUPABASE_URL) return null;

  try {
    const { data, error } = await supabase
      .from('discovery_runs')
      .insert([{ status: 'IN_PROGRESS' }])
      .select('id')
      .single();

    if (error) {
      console.error('Failed to start discovery run in Supabase:', error.message);
      return null;
    }

    return data.id;
  } catch (err) {
    console.error('Exception starting discovery run:', err);
    return null;
  }
}

export async function finishRun(
  runId: string | null,
  stats: {
    total_found: number;
    accepted: number;
    review_required: number;
    duplicates: number;
    failed: number;
    duration_ms: number;
    status: 'COMPLETED' | 'FAILED';
  }
) {
  if (!runId || !process.env.SUPABASE_URL) return;

  try {
    const { error } = await supabase
      .from('discovery_runs')
      .update({
        completed_at: new Date().toISOString(),
        duration_ms: stats.duration_ms,
        total_found: stats.total_found,
        accepted: stats.accepted,
        review_required: stats.review_required,
        duplicates: stats.duplicates,
        failed: stats.failed,
        status: stats.status
      })
      .eq('id', runId);

    if (error) {
      console.error('Failed to finish discovery run in Supabase:', error.message);
    }
  } catch (err) {
    console.error('Exception finishing discovery run:', err);
  }
}
