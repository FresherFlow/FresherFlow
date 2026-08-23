import { pool } from '../pool.js';
import { resolveCompanyWebsiteAndLogo } from '@fresherflow/utils';

export interface ProcessedJobPayload {
  discoveredJobId?: string | null;
  type: string;
  title: string;
  company: string;
  companyId?: string | null;
  companyWebsite?: string | null;
  companyLogoUrl?: string | null;
  description: string;
  allowedDegrees?: string[];
  allowedCourses?: string[];
  allowedSpecializations?: string[];
  allowedPassoutYears?: (number | string)[];
  requiredSkills?: string[];
  locations?: string[];
  structuredLocations?: any;
  workMode?: string | null;
  experienceMin?: number | null;
  experienceMax?: number | null;
  salaryRange?: string | null;
  salaryAmount?: string | null;
  salaryPeriod?: string | null;
  employmentType?: string | null;
  jobFunction?: string | null;
  incentives?: string | null;
  selectionProcess?: string | null;
  notesHighlights?: string | null;
  applyLink: string;
  sourceUrl?: string | null;
  customSlug?: string | null;
  applicationDetails?: any;
  walkInDetails?: any;
  status?: string;
}

/**
 * Upserts a fully processed job into the Supabase / PostgreSQL `processed_jobs` table.
 * Fully aligned with production Supabase DDL schema:
 * - allowed_passout_years as integer[]
 * - structured_locations, application_details, walk_in_details as JSONB
 * - company_id foreign key with auto-provisioning
 * - unique custom_slug collision handling
 */
export async function upsertProcessedJob(
  job: ProcessedJobPayload,
  sourceUrl?: string,
  applyLink?: string
): Promise<boolean> {
  const finalApplyLink = applyLink || job.applyLink;
  const finalSourceUrl = sourceUrl || job.sourceUrl || finalApplyLink;
  const { website, logoUrl } = resolveCompanyWebsiteAndLogo(job.company, finalApplyLink, job.companyWebsite);

  // 1. Auto-provision company if companyId is supplied to prevent FK violations
  let validCompanyId: string | null = null;
  const rawCompanyId = job.companyId || null;
  if (rawCompanyId) {
    try {
      const companySlug = String(rawCompanyId).toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-');
      await pool.query(
        `INSERT INTO companies (id, name, slug, website, logo, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (id) DO UPDATE SET updated_at = NOW()`,
        [rawCompanyId, job.company || rawCompanyId, companySlug, website || null, logoUrl || null]
      );
      validCompanyId = rawCompanyId;
    } catch (compErr: any) {
      console.warn(`[DB] Note: Could not ensure company ${rawCompanyId}: ${compErr.message}. Defaulting company_id to NULL.`);
      validCompanyId = null;
    }
  }

  // 2. Ensure custom_slug uniqueness
  let customSlug = job.customSlug || null;
  if (customSlug) {
    try {
      const { rows: existingSlug } = await pool.query(
        `SELECT id FROM processed_jobs WHERE custom_slug = $1 AND apply_link != $2 LIMIT 1`,
        [customSlug, finalApplyLink]
      );
      if (existingSlug && existingSlug.length > 0) {
        customSlug = `${customSlug}-${Math.random().toString(36).slice(2, 7)}`;
      }
    } catch {
      // Non-blocking
    }
  }

  // 3. Fallback for description (NOT NULL column)
  const description = job.description?.trim() || `${job.title} at ${job.company}. Visit the official careers portal for details.`;

  // 4. Clean passout years as integers for integer[] column
  const passoutYears: number[] = Array.isArray(job.allowedPassoutYears)
    ? job.allowedPassoutYears
        .map((y) => parseInt(String(y).trim(), 10))
        .filter((y) => !isNaN(y) && y >= 2000 && y <= 2040)
    : [];

  const payload = {
    discovered_job_id: job.discoveredJobId || null,
    type: job.type || 'JOB',
    title: job.title || 'Job Opportunity',
    company: job.company || 'Company',
    company_id: validCompanyId,
    company_website: website || job.companyWebsite || null,
    company_logo_url: logoUrl || null,
    description,
    allowed_degrees: Array.isArray(job.allowedDegrees) ? job.allowedDegrees.map(String) : [],
    allowed_courses: Array.isArray(job.allowedCourses) ? job.allowedCourses.map(String) : [],
    allowed_specializations: Array.isArray(job.allowedSpecializations) ? job.allowedSpecializations.map(String) : [],
    allowed_passout_years: passoutYears,
    required_skills: Array.isArray(job.requiredSkills) ? job.requiredSkills.map(String) : [],
    locations: Array.isArray(job.locations) ? job.locations.map(String) : [],
    structured_locations: job.structuredLocations ? JSON.stringify(job.structuredLocations) : null,
    work_mode: job.workMode || null,
    experience_min: job.experienceMin !== undefined && job.experienceMin !== null ? Math.round(Number(job.experienceMin)) : 0,
    experience_max: job.experienceMax !== undefined && job.experienceMax !== null ? Math.round(Number(job.experienceMax)) : 0,
    salary_range: job.salaryRange || null,
    salary_amount: job.salaryAmount || null,
    salary_period: job.salaryPeriod || 'YEARLY',
    employment_type: job.employmentType || null,
    job_function: job.jobFunction || null,
    incentives: job.incentives || null,
    selection_process: job.selectionProcess || null,
    notes_highlights: job.notesHighlights || null,
    apply_link: finalApplyLink,
    source_url: finalSourceUrl,
    custom_slug: customSlug,
    application_details: job.applicationDetails ? JSON.stringify(job.applicationDetails) : null,
    walk_in_details: job.walkInDetails ? JSON.stringify(job.walkInDetails) : null,
    status: job.status || 'PENDING_REVIEW',
  };

  try {
    const { rows: existing } = await pool.query(
      `SELECT id FROM processed_jobs WHERE apply_link = $1 LIMIT 1`,
      [finalApplyLink]
    );

    if (existing && existing.length > 0) {
      await pool.query(
        `UPDATE processed_jobs SET
            type = $1,
            title = $2,
            company = $3,
            company_id = $4,
            company_website = $5,
            company_logo_url = $6,
            description = $7,
            allowed_degrees = $8,
            allowed_courses = $9,
            allowed_specializations = $10,
            allowed_passout_years = $11,
            required_skills = $12,
            locations = $13,
            structured_locations = $14::jsonb,
            work_mode = $15,
            experience_min = $16,
            experience_max = $17,
            salary_range = $18,
            salary_amount = $19,
            salary_period = $20,
            employment_type = $21,
            job_function = $22,
            incentives = $23,
            selection_process = $24,
            notes_highlights = $25,
            source_url = $26,
            custom_slug = $27,
            application_details = $28::jsonb,
            walk_in_details = $29::jsonb,
            status = $30,
            updated_at = NOW()
        WHERE apply_link = $31`,
        [
          payload.type,
          payload.title,
          payload.company,
          payload.company_id,
          payload.company_website,
          payload.company_logo_url,
          payload.description,
          payload.allowed_degrees,
          payload.allowed_courses,
          payload.allowed_specializations,
          payload.allowed_passout_years,
          payload.required_skills,
          payload.locations,
          payload.structured_locations,
          payload.work_mode,
          payload.experience_min,
          payload.experience_max,
          payload.salary_range,
          payload.salary_amount,
          payload.salary_period,
          payload.employment_type,
          payload.job_function,
          payload.incentives,
          payload.selection_process,
          payload.notes_highlights,
          payload.source_url,
          payload.custom_slug,
          payload.application_details,
          payload.walk_in_details,
          payload.status,
          finalApplyLink,
        ]
      );
    } else {
      await pool.query(
        `INSERT INTO processed_jobs (
            discovered_job_id,
            type,
            title,
            company,
            company_id,
            company_website,
            company_logo_url,
            description,
            allowed_degrees,
            allowed_courses,
            allowed_specializations,
            allowed_passout_years,
            required_skills,
            locations,
            structured_locations,
            work_mode,
            experience_min,
            experience_max,
            salary_range,
            salary_amount,
            salary_period,
            employment_type,
            job_function,
            incentives,
            selection_process,
            notes_highlights,
            apply_link,
            source_url,
            custom_slug,
            application_details,
            walk_in_details,
            status,
            created_at,
            updated_at
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15::jsonb, $16, $17, $18, $19, $20,
            $21, $22, $23, $24, $25, $26, $27, $28, $29, $30::jsonb,
            $31::jsonb, $32, NOW(), NOW()
        )`,
        [
          payload.discovered_job_id,
          payload.type,
          payload.title,
          payload.company,
          payload.company_id,
          payload.company_website,
          payload.company_logo_url,
          payload.description,
          payload.allowed_degrees,
          payload.allowed_courses,
          payload.allowed_specializations,
          payload.allowed_passout_years,
          payload.required_skills,
          payload.locations,
          payload.structured_locations,
          payload.work_mode,
          payload.experience_min,
          payload.experience_max,
          payload.salary_range,
          payload.salary_amount,
          payload.salary_period,
          payload.employment_type,
          payload.job_function,
          payload.incentives,
          payload.selection_process,
          payload.notes_highlights,
          payload.apply_link,
          payload.source_url,
          payload.custom_slug,
          payload.application_details,
          payload.walk_in_details,
          payload.status,
        ]
      );
    }

    // 4. Update company_statistics for the company
    if (payload.company_id) {
      try {
        await pool.query(
          `INSERT INTO company_statistics (company_id, total_jobs, avg_jobs_per_month, last_hiring_date, freshers_score, updated_at)
           VALUES ($1, 1, 1.0, NOW(), 85, NOW())
           ON CONFLICT (company_id) DO UPDATE SET
           total_jobs = company_statistics.total_jobs + 1,
           last_hiring_date = NOW(),
           updated_at = NOW()`,
          [payload.company_id]
        );
      } catch {
        // Non-critical
      }
    }

    return true;
  } catch (err: any) {
    console.error(`[DB] Failed to upsert processed job:`, err.message || err);
    if (err.detail) console.error(`Detail:`, err.detail);
    if (err.code) console.error(`Code:`, err.code);
    return false;
  }
}
