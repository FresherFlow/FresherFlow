import { pool, hasDb } from '../pool.js';
import { parseJobUrl } from '@fresherflow/parser';

export async function upsertJobs(jobs: any[], runId: string | null) {
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
      run_id: runId || null,
      company_id: null, // Avoid FK dependency during raw discovery
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
      tags: job.tags && Array.isArray(job.tags) ? job.tags : [],
      company_stage: job.companyStage || null,
      company_industry: job.companyIndustry || null,
      company_logo: job.companyLogo || null,
      company_url: job.companyUrl || null,
      job_function: job.jobFunction || null,
      location_city: job.parsedLocation?.city || null,
      location_country: job.parsedLocation?.country || null,
      description: job.description || null,
      experience_level: job.experienceLevel || null,
      experience_years: job.experienceYears || null,
      is_remote: job.isRemote || false,
      posted_at: job.postedAt || null,
      venue_address: job.venueAddress || job.walkInDetails?.venueAddress || null,
      cluster_name: job.clusterName || job.cluster?.cluster?.name || null,
      latitude: job.latitude || job.cluster?.latitude || null,
      longitude: job.longitude || job.cluster?.longitude || null,
      walkin_date: job.walkinDate || job.walkInDetails?.dateRange || null,
      walkin_time: job.walkinTime || job.walkInDetails?.timeRange || null,
      reporting_time: job.reportingTime || job.walkInDetails?.reportingTime || null,
      contact_person: job.contactPerson || job.walkInDetails?.contactPerson || null,
      contact_phone: job.contactPhone || job.walkInDetails?.contactPhone || null,
      required_docs: job.requiredDocs || (job.walkInDetails?.requiredDocuments ? JSON.stringify(job.walkInDetails.requiredDocuments) : null),
    };
  });

  // Chunk array to avoid Supabase limits (batch of 100)
  const chunkSize = 100;
  for (let i = 0; i < mappedJobs.length; i += chunkSize) {
    const chunk = mappedJobs.slice(i, i + chunkSize);
    
    try {
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
                run_id, company_id, source, source_type, company, title, location, employment_type, apply_link, external_id, fresher_score, review_required, status, updated_at, last_seen_at, department, batch_year, degree, skills, tags, company_stage, company_industry, company_logo, company_url, job_function, location_city, location_country, description, experience_level, experience_years, is_remote, posted_at,
                venue_address, cluster_name, latitude, longitude, walkin_date, walkin_time, reporting_time, contact_person, contact_phone, required_docs
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32,
                $33, $34, $35, $36, $37, $38, $39, $40, $41, $42
              ) ON CONFLICT (source, external_id) DO UPDATE SET
                updated_at = EXCLUDED.updated_at,
                last_seen_at = EXCLUDED.last_seen_at,
                company_stage = COALESCE(EXCLUDED.company_stage, discovered_jobs.company_stage),
                company_industry = COALESCE(EXCLUDED.company_industry, discovered_jobs.company_industry),
                company_logo = COALESCE(EXCLUDED.company_logo, discovered_jobs.company_logo),
                company_url = COALESCE(EXCLUDED.company_url, discovered_jobs.company_url),
                job_function = COALESCE(EXCLUDED.job_function, discovered_jobs.job_function),
                tags = COALESCE(EXCLUDED.tags, discovered_jobs.tags),
                venue_address = COALESCE(EXCLUDED.venue_address, discovered_jobs.venue_address),
                cluster_name = COALESCE(EXCLUDED.cluster_name, discovered_jobs.cluster_name),
                latitude = COALESCE(EXCLUDED.latitude, discovered_jobs.latitude),
                longitude = COALESCE(EXCLUDED.longitude, discovered_jobs.longitude),
                walkin_date = COALESCE(EXCLUDED.walkin_date, discovered_jobs.walkin_date),
                walkin_time = COALESCE(EXCLUDED.walkin_time, discovered_jobs.walkin_time),
                reporting_time = COALESCE(EXCLUDED.reporting_time, discovered_jobs.reporting_time)`,
              [
                row.run_id, row.company_id, row.source, row.source_type, row.company, row.title, row.location, row.employment_type, row.apply_link, row.external_id, row.fresher_score, row.review_required, row.status, row.updated_at, row.last_seen_at, row.department, row.batch_year, row.degree, row.skills, row.tags, row.company_stage, row.company_industry, row.company_logo, row.company_url, row.job_function, row.location_city, row.location_country, row.description, row.experience_level, row.experience_years, row.is_remote, row.posted_at,
                row.venue_address, row.cluster_name, row.latitude, row.longitude, row.walkin_date, row.walkin_time, row.reporting_time, row.contact_person, row.contact_phone, row.required_docs
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
                run_id, company_id, source, source_type, company, title, location, employment_type, apply_link, external_id, fresher_score, review_required, status, updated_at, last_seen_at, department, batch_year, degree, skills, tags, company_stage, company_industry, company_logo, company_url, job_function, location_city, location_country, description, experience_level, experience_years, is_remote, posted_at,
                venue_address, cluster_name, latitude, longitude, walkin_date, walkin_time, reporting_time, contact_person, contact_phone, required_docs
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32,
                $33, $34, $35, $36, $37, $38, $39, $40, $41, $42
              ) ON CONFLICT (source, apply_link) DO UPDATE SET
                updated_at = EXCLUDED.updated_at,
                last_seen_at = EXCLUDED.last_seen_at,
                company_stage = COALESCE(EXCLUDED.company_stage, discovered_jobs.company_stage),
                company_industry = COALESCE(EXCLUDED.company_industry, discovered_jobs.company_industry),
                company_logo = COALESCE(EXCLUDED.company_logo, discovered_jobs.company_logo),
                company_url = COALESCE(EXCLUDED.company_url, discovered_jobs.company_url),
                job_function = COALESCE(EXCLUDED.job_function, discovered_jobs.job_function),
                tags = COALESCE(EXCLUDED.tags, discovered_jobs.tags),
                venue_address = COALESCE(EXCLUDED.venue_address, discovered_jobs.venue_address),
                cluster_name = COALESCE(EXCLUDED.cluster_name, discovered_jobs.cluster_name),
                latitude = COALESCE(EXCLUDED.latitude, discovered_jobs.latitude),
                longitude = COALESCE(EXCLUDED.longitude, discovered_jobs.longitude),
                walkin_date = COALESCE(EXCLUDED.walkin_date, discovered_jobs.walkin_date),
                walkin_time = COALESCE(EXCLUDED.walkin_time, discovered_jobs.walkin_time),
                reporting_time = COALESCE(EXCLUDED.reporting_time, discovered_jobs.reporting_time)`,
              [
                row.run_id, row.company_id, row.source, row.source_type, row.company, row.title, row.location, row.employment_type, row.apply_link, row.external_id, row.fresher_score, row.review_required, row.status, row.updated_at, row.last_seen_at, row.department, row.batch_year, row.degree, row.skills, row.tags, row.company_stage, row.company_industry, row.company_logo, row.company_url, row.job_function, row.location_city, row.location_country, row.description, row.experience_level, row.experience_years, row.is_remote, row.posted_at,
                row.venue_address, row.cluster_name, row.latitude, row.longitude, row.walkin_date, row.walkin_time, row.reporting_time, row.contact_person, row.contact_phone, row.required_docs
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
        `SELECT id, apply_link, source, source_url, company, title, description, location, location_city, is_remote, experience_years, employment_type, skills, posted_at, batch_year, degree, department, status 
         FROM discovered_jobs 
         WHERE status IN ('PENDING', 'APPROVED') 
         ORDER BY created_at DESC 
         LIMIT $1`,
        [limit]
    );
    return rows;
}

export async function markDiscoveredJobStatus(
    id: string,
    status: 'PENDING' | 'PROCESSED' | 'REJECTED' | 'EXPIRED'
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

export async function deleteDiscoveredJob(id: string): Promise<void> {
    try {
        await pool.query(`DELETE FROM discovered_jobs WHERE id = $1`, [id]);
    } catch (error) {
        console.warn(`[DB] Failed to delete job ${id}: ${(error as Error).message}`);
    }
}
