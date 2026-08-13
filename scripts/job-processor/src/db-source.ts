import pg from 'pg';
const { Pool } = pg;

export interface DiscoveredJobRow {
    id: string;
    apply_link: string;
    source: string;
    source_url?: string;
    company: string;
    title: string;
    ats_text?: string;
    description?: string;
    location?: string;
    location_city?: string;
    is_remote?: boolean;
    experience_years?: number;
    employment_type?: string;
    skills?: string; // JSON string
    posted_at?: string;
    batch_year?: string;
    degree?: string;
    department?: string;
    status: string;
}

const connectionString =
  process.env.INGESTION_DATABASE_URL ||
  process.env.STAGING_DATABASE_URL ||
  process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

export async function fetchUnprocessedFromSupabase(limit = 100): Promise<DiscoveredJobRow[]> {
    const { rows } = await pool.query<DiscoveredJobRow>(
        `SELECT id, apply_link, source, source_type as source_url, company, title, ats_text, location, status FROM discovered_jobs WHERE status = 'DISCOVERED' ORDER BY created_at DESC LIMIT $1`,
        [limit]
    );
    return rows;
}

export async function markDiscoveredJobStatus(
    id: string,
    status: 'PROCESSING' | 'PROCESSED' | 'REJECTED' | 'FAILED'
): Promise<void> {
    try {
        await pool.query(
            `UPDATE discovered_jobs SET status = $1, updated_at = NOW() WHERE id = $2`,
            [status, id]
        );
    } catch (error) {
        console.warn(`[DB] Failed to mark job ${id} as ${status}: ${(error as Error).message}`);
    }
}
