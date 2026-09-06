import { pool, hasDb } from '../pool.js';
import { parseJobUrl } from '@fresherflow/parser';

export async function upsertJobs(jobs: any[], runId: string | null) {
  if (!hasDb || jobs.length === 0) return;


  const mappedJobs = jobs.map(job => {
    // Determine source and external_id
    let source = job.sourceType === 'ATS' ? 'unknown-ats' : 'aggregator';
    let external_id: string | null = null;
    let company = job.company || 'unknown';

    // When an ATS adapter already resolved the provider and its structured ID,
    // trust it directly. URL re-parsing is only a fallback because some ATS
    // boards use custom career domains the URL parser does not recognize
    // (e.g. recruitment hosts per company).
    if (job.sourceType === 'ATS' && job.site) {
      source = job.site;
      external_id = job.atsId || job.externalId || null;
      if (job.company && job.company !== 'unknown') {
        company = job.company;
      }
    } else {
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
      company_url_direct: job.companyUrlDirect || null,
      company_num_employees: job.companyNumEmployees || null,
      job_function: job.jobFunction || null,
      location_city: job.locationCity || job.parsedLocation?.city || null,
      location_country: job.locationCountry || job.parsedLocation?.country || null,
      location_region: job.locationRegion || job.parsedLocation?.region || null,
      description: job.atsText || job.description || job.rawHtml || null,
      description_source: job.descriptionSource || null,
      experience_level: job.experienceLevel || null,
      experience_range: job.experienceRange || null,
      experience_years: job.experienceYears || null,
      is_remote: job.isRemote || false,
      work_from_home_type: job.workFromHomeType || null,
      job_type: job.jobType ? (Array.isArray(job.jobType) ? job.jobType[0] : job.jobType) : null,
      listing_type: job.listingType || null,
      job_level: job.jobLevel || null,
      site: job.site || null,
      ats_id: job.atsId || null,
      board_token: job.boardToken || null,
      source_url: job.sourceUrl || job.jobUrlDirect || job.applyUrl || null,
      apply_url: job.applyUrl || null,
      job_url_direct: job.jobUrlDirect || null,
      salary_min: job.salaryMin ?? job.compensation?.minAmount ?? null,
      salary_max: job.salaryMax ?? job.compensation?.maxAmount ?? null,
      salary_currency: job.salaryCurrency ?? job.compensation?.currency ?? null,
      salary_interval: job.salaryInterval ?? job.compensation?.interval ?? null,
      salary_source: job.salarySource || null,
      emails: job.emails ? (Array.isArray(job.emails) ? JSON.stringify(job.emails) : String(job.emails)) : null,
      vacancy_count: job.vacancyCount || null,
      team: job.team || null,
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

      const COLUMNS = [
        'run_id', 'company_id', 'source', 'source_type', 'company', 'title', 'location', 'employment_type', 'apply_link', 'external_id', 'fresher_score', 'review_required', 'status', 'updated_at', 'last_seen_at', 'department', 'batch_year', 'degree', 'skills', 'tags', 'company_stage', 'company_industry', 'company_logo', 'company_url', 'company_url_direct', 'company_num_employees', 'job_function', 'location_city', 'location_country', 'location_region', 'description', 'description_source', 'experience_level', 'experience_range', 'experience_years', 'is_remote', 'work_from_home_type', 'job_type', 'listing_type', 'job_level', 'site', 'ats_id', 'board_token', 'source_url', 'apply_url', 'job_url_direct', 'salary_min', 'salary_max', 'salary_currency', 'salary_interval', 'salary_source', 'emails', 'vacancy_count', 'team', 'posted_at',
        'venue_address', 'cluster_name', 'latitude', 'longitude', 'walkin_date', 'walkin_time', 'reporting_time', 'contact_person', 'contact_phone', 'required_docs'
      ];
      const UPSERT_GROUPS = [
        'company_stage', 'company_industry', 'company_logo', 'company_url',
        'company_url_direct', 'company_num_employees', 'job_function',
        'location', 'location_city', 'location_country', 'location_region', 'description_source',
        'experience_level', 'experience_range', 'experience_years', 'is_remote',
        'work_from_home_type', 'job_type', 'listing_type', 'job_level', 'site', 'ats_id',
        'board_token', 'source_url', 'apply_url', 'job_url_direct',
        'salary_min', 'salary_max', 'salary_currency', 'salary_interval', 'salary_source',
        'emails', 'vacancy_count', 'team', 'department', 'batch_year', 'degree', 'skills', 'tags',
        'posted_at',
        'venue_address', 'cluster_name', 'latitude', 'longitude',
        'walkin_date', 'walkin_time', 'reporting_time', 'contact_person', 'contact_phone', 'required_docs'
      ];
      const colList = COLUMNS.join(', ');
      const paramList = COLUMNS.map((_, idx) => `$${idx + 1}`).join(', ');

      if (withExt.length > 0) {
        for (const row of withExt) {
          try {
            await pool.query(
              `INSERT INTO discovered_jobs (${colList}) VALUES (${paramList})
               ON CONFLICT (source, external_id) DO UPDATE SET
                 updated_at = EXCLUDED.updated_at,
                 last_seen_at = EXCLUDED.last_seen_at` +
              UPSERT_GROUPS.map(c => `,\n                ${c} = COALESCE(EXCLUDED.${c}, discovered_jobs.${c})`).join(''),
              COLUMNS.map((c: string) => (row as any)[c])
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
              `INSERT INTO discovered_jobs (${colList}) VALUES (${paramList})
               ON CONFLICT (source, apply_link) DO UPDATE SET
                 updated_at = EXCLUDED.updated_at,
                 last_seen_at = EXCLUDED.last_seen_at` +
              UPSERT_GROUPS.map(c => `,\n                ${c} = COALESCE(EXCLUDED.${c}, discovered_jobs.${c})`).join(''),
              COLUMNS.map((c: string) => (row as any)[c])
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
    description?: string;
    location?: string;
    location_city?: string;
    location_country?: string;
    location_region?: string;
    is_remote?: boolean;
    employment_type?: string;
    job_type?: string;
    job_level?: string;
    work_from_home_type?: string;
    experience_years?: number;
    experience_level?: string;
    experience_range?: string;
    salary_min?: number;
    salary_max?: number;
    salary_currency?: string;
    salary_interval?: string;
    skills?: string; // JSON string
    posted_at?: string;
    batch_year?: string;
    degree?: string;
    department?: string;
    job_function?: string;
    ats_id?: string;
    site?: string;
    status: string;
}

export async function fetchUnprocessedFromSupabase(limit = 100): Promise<DiscoveredJobRow[]> {
    const { rows } = await pool.query<DiscoveredJobRow>(
        `SELECT id, apply_link, source, source_url, company, title, description, location, location_city, location_country, location_region, is_remote, employment_type, job_type, job_level, work_from_home_type, skills, experience_level, experience_range, experience_years, salary_min, salary_max, salary_currency, salary_interval, batch_year, degree, department, job_function, posted_at, ats_id, site, status 
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
