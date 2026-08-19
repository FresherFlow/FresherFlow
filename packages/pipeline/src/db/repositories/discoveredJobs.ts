import { pool } from '../pool.js';
import { parseJobUrl } from '@fresherflow/parser';

export async function upsertJobs(jobs: any[], runId: string | null) {
  const hasDb = Boolean(
    process.env.INGESTION_DATABASE_URL ||
    process.env.STAGING_DATABASE_URL ||
    process.env.DATABASE_URL
  );
  if (!hasDb || jobs.length === 0) return;

  const mappedJobs = jobs.map(job => {
    // Determine source and external_id
    let source = job.sourceType === 'ATS' ? 'unknown-ats' : 'aggregator';
    let external_id: string | null = null;
    let company = job.company || 'unknown';

    const parsed = parseJobUrl(job.applyLink);
    if (parsed) {
      source = parsed.adapter;
      external_id = parsed.jobId;
      // For ATS jobs, the adapter already resolved the real company name from the API.
      // Only fall back to URL-parsed company for aggregator jobs.
      if (job.sourceType === 'ATS' && job.company && job.company !== 'unknown') {
        company = job.company; // keep what the adapter returned
      } else {
        company = parsed.company || job.company || 'unknown';
      }
    } else if (job.sourceType === 'AGGREGATOR') {
      // For aggregators (e.g. YC, Wellfound), we might not have a clean parser yet.
      // Use the domain as the source.
      try {
        const url = new URL(job.applyLink);
        source = url.hostname.replace('www.', '');
      } catch {}
    }

    return {
      run_id: runId,
      company_id: job.companyId || job.company_id || null,
      source: source,
      source_type: job.sourceType,
      company: company,
      title: job.title || 'Unknown Title',
      location: job.location || null,
      employment_type: job.employmentType || null,
      apply_link: job.applyLink,
      external_id: external_id,
      fresher_score: job.fresherScore || null,
      review_required: job.reviewRequired || false,
      status: job.reviewRequired ? 'PENDING' : 'APPROVED',
      updated_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      department: job.department || null,
      batch_year: job.batchYear || null,
      degree: job.degree || null,
      skills: job.skills && Array.isArray(job.skills) ? JSON.stringify(job.skills) : null,
      location_city: job.parsedLocation?.city || null,
      location_country: job.parsedLocation?.country || null,
      description: job.description || null,
      experience_level: job.experienceLevel || null,
      experience_years: job.experienceYears || null,
      is_remote: job.isRemote || false,
      posted_at: job.postedAt || null
    };
  });

  // Chunk array to avoid Supabase limits (batch of 100)
  const chunkSize = 100;
  for (let i = 0; i < mappedJobs.length; i += chunkSize) {
    const chunk = mappedJobs.slice(i, i + chunkSize);
    
    try {
      // Use ON CONFLICT (source, apply_link) and (source, external_id)
      // Since Supabase `upsert` only supports one conflict constraint per call natively via the SDK
      // on a unique column/constraint, we'll let the database handle it by specifying onConflict
      // Wait, onConflict takes a comma-separated list of columns that form a unique constraint.
      // If we have TWO partial unique constraints, Supabase SDK's `.upsert()` can be tricky.
      // To bypass this, we just don't pass `onConflict` and let PostgREST infer it from the primary key.
      // Wait! We want to upsert based on the unique constraints, NOT the primary key (we don't have IDs for new jobs).
      // We might get an error if we have multiple partial unique indexes.
      // For safety, we will just use `insert` and ignore duplicates on the DB side if we can't reliably upsert.
      // Actually, standard `upsert` in Supabase without `onConflict` tries to use the Primary Key.
      // Since we don't have the `id` (primary key), we must specify `onConflict`.
      // Since we have TWO partial unique indexes, passing both might fail in PostgREST.
      // A better approach for this script: We just try to `insert()` and if it fails due to unique constraint, 
      // we could ignore it. But we WANT to update `last_seen_at`!
      
      // We can iterate the chunk and insert one by one? No, chunking is for batch inserts.
      // Let's use `onConflict: 'source, external_id'` as a generic string and if it fails, fallback.
      // Alternatively, let's just use `upsert` and ignore errors (the logs might complain, but it's safe).
      
      // To do this properly with multiple partial indexes via PostgREST is impossible in a single `upsert`.
      // We will separate the chunk into two groups: those with external_id, and those without.
      // Deduplicate within the batch before upserting to prevent "ON CONFLICT DO UPDATE command cannot affect row a second time"
      const withExtMap = new Map<string, typeof mappedJobs[0]>();
      chunk.filter(j => j.external_id !== null).forEach(j => {
        withExtMap.set(`${j.source}:${j.external_id}`, j);
      });
      const withExt = Array.from(withExtMap.values());

      const withoutExtMap = new Map<string, typeof mappedJobs[0]>();
      chunk.filter(j => j.external_id === null).forEach(j => {
        withoutExtMap.set(`${j.source}:${j.apply_link}`, j);
      });
      const withoutExt = Array.from(withoutExtMap.values());

      if (withExt.length > 0) {
        for (const row of withExt) {
          try {
            await pool.query(
              `INSERT INTO discovered_jobs (
                run_id, company_id, source, source_type, company, title, location, employment_type, apply_link, external_id, fresher_score, review_required, status, updated_at, last_seen_at, department, batch_year, degree, skills, location_city, location_country, description, experience_level, experience_years, is_remote, posted_at
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
              ) ON CONFLICT (source, external_id) DO UPDATE SET
                updated_at = EXCLUDED.updated_at,
                last_seen_at = EXCLUDED.last_seen_at`,
              [
                row.run_id, row.company_id, row.source, row.source_type, row.company, row.title, row.location, row.employment_type, row.apply_link, row.external_id, row.fresher_score, row.review_required, row.status, row.updated_at, row.last_seen_at, row.department, row.batch_year, row.degree, row.skills, row.location_city, row.location_country, row.description, row.experience_level, row.experience_years, row.is_remote, row.posted_at
              ]
            );
          } catch (error: any) {
            console.error('Error upserting jobs (with external_id):', error.message);
          }
        }
      }

      if (withoutExt.length > 0) {
        for (const row of withoutExt) {
          try {
            await pool.query(
              `INSERT INTO discovered_jobs (
                run_id, company_id, source, source_type, company, title, location, employment_type, apply_link, external_id, fresher_score, review_required, status, updated_at, last_seen_at, department, batch_year, degree, skills, location_city, location_country, description, experience_level, experience_years, is_remote, posted_at
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
              ) ON CONFLICT (source, apply_link) DO UPDATE SET
                updated_at = EXCLUDED.updated_at,
                last_seen_at = EXCLUDED.last_seen_at`,
              [
                row.run_id, row.company_id, row.source, row.source_type, row.company, row.title, row.location, row.employment_type, row.apply_link, row.external_id, row.fresher_score, row.review_required, row.status, row.updated_at, row.last_seen_at, row.department, row.batch_year, row.degree, row.skills, row.location_city, row.location_country, row.description, row.experience_level, row.experience_years, row.is_remote, row.posted_at
              ]
            );
          } catch (error: any) {
            console.error('Error upserting jobs (without external_id):', error.message);
          }
        }
      }

    } catch (err) {
      console.error('Exception during Supabase chunk upsert:', err);
    }
  }
}
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
