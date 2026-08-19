import { pool } from '../pool.js';


export async function startRun(): Promise<string | null> {
  const hasDb = Boolean(
    process.env.INGESTION_DATABASE_URL ||
    process.env.STAGING_DATABASE_URL ||
    process.env.DATABASE_URL
  );
  if (!hasDb) return null;

  try {
    
    const { rows } = await pool.query(
      `INSERT INTO discovery_runs (status) VALUES ('IN_PROGRESS') RETURNING id`
    );
    return rows[0].id;
  } catch (err) {
    console.error('Exception starting discovery run:', (err as Error).message);
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
    metadata?: Record<string, any>;
  }
) {
  const hasDb = Boolean(
    process.env.INGESTION_DATABASE_URL ||
    process.env.STAGING_DATABASE_URL ||
    process.env.DATABASE_URL
  );
  if (!runId || !hasDb) return;

  try {
    await pool.query(
      `UPDATE discovery_runs 
       SET completed_at = NOW(), duration_ms = $1, total_found = $2, accepted = $3, 
           review_required = $4, duplicates = $5, failed = $6, status = $7, metadata = $8 
       WHERE id = $9`,
      [
        stats.duration_ms,
        stats.total_found,
        stats.accepted,
        stats.review_required,
        stats.duplicates,
        stats.failed,
        stats.status,
        stats.metadata || null,
        runId
      ]
    );
  } catch (err) {
    console.error('Exception finishing discovery run:', (err as Error).message);
  }
}
