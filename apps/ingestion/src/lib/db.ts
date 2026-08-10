import pg from 'pg';
const { Pool } = pg;

const connectionString =
  process.env.INGESTION_DATABASE_URL ||
  process.env.STAGING_DATABASE_URL ||
  process.env.DATABASE_URL;

export const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

export async function ensureTablesExist() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS discovered_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source TEXT NOT NULL DEFAULT 'ATS',
        source_type TEXT NOT NULL DEFAULT 'ATS',
        company TEXT NOT NULL,
        title TEXT NOT NULL,
        location TEXT,
        apply_link TEXT NOT NULL,
        ats_type TEXT,
        ats_text TEXT,
        fresher_score INT DEFAULT 0,
        status TEXT DEFAULT 'DISCOVERED',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT discovered_jobs_source_apply_link_key UNIQUE (source, apply_link)
      );

      CREATE TABLE IF NOT EXISTS processed_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        discovered_job_id UUID REFERENCES discovered_jobs(id) ON DELETE SET NULL,
        type TEXT NOT NULL DEFAULT 'JOB',
        title TEXT NOT NULL,
        company TEXT NOT NULL,
        company_website TEXT,
        company_logo_url TEXT,
        description TEXT NOT NULL DEFAULT '',
        allowed_degrees TEXT[] DEFAULT '{}',
        allowed_courses TEXT[] DEFAULT '{}',
        allowed_specializations TEXT[] DEFAULT '{}',
        allowed_passout_years INT[] DEFAULT '{}',
        required_skills TEXT[] DEFAULT '{}',
        locations TEXT[] DEFAULT '{}',
        structured_locations JSONB,
        work_mode TEXT,
        experience_min INT DEFAULT 0,
        experience_max INT DEFAULT 0,
        salary_range TEXT,
        salary_period TEXT DEFAULT 'YEARLY',
        employment_type TEXT,
        job_function TEXT,
        apply_link TEXT NOT NULL UNIQUE,
        status TEXT DEFAULT 'PUBLISHED',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS discovery_runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        started_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        duration_ms BIGINT,
        total_found INT DEFAULT 0,
        accepted INT DEFAULT 0,
        review_required INT DEFAULT 0,
        duplicates INT DEFAULT 0,
        failed INT DEFAULT 0,
        status TEXT DEFAULT 'COMPLETED',
        metadata JSONB
      );
    `);
    console.log('[Ingestion DB] Schema tables verified.');
  } catch (err: any) {
    console.warn('[Ingestion DB] Table initialization warning:', err.message);
  }
}

void ensureTablesExist();
