import { ExtractedJob } from './normalizer';
import { resolveCompanyWebsiteAndLogo } from '@fresherflow/utils';
import pg from 'pg';
const { Pool } = pg;

const connectionString =
  process.env.INGESTION_DATABASE_URL ||
  process.env.STAGING_DATABASE_URL ||
  process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

// POST parsed job to ingestion postgres processed_jobs table
export async function saveJobToSupabase(
    job: ExtractedJob,
    sourceLink: string,
    applyLink: string
): Promise<boolean> {
    const { website, logoUrl } = resolveCompanyWebsiteAndLogo(job.company, applyLink, job.companyWebsite);

    const payload = {
        type: job.type || 'JOB',
        title: job.title,
        company: job.company,
        company_id: (job as any).companyId || (job as any).company_id || null,
        company_website: website || job.companyWebsite || null,
        company_logo_url: logoUrl || null,
        description: job.description || null,
        allowed_degrees: job.allowedDegrees || [],
        allowed_courses: job.allowedCourses || [],
        allowed_specializations: job.allowedSpecializations || [],
        allowed_passout_years: job.allowedPassoutYears || [],
        required_skills: job.requiredSkills || [],
        locations: job.locations || [],
        structured_locations: job.structuredLocations ? JSON.stringify(job.structuredLocations) : null,
        work_mode: job.workMode || null,
        experience_min: job.experienceMin !== undefined && job.experienceMin !== null ? Math.round(job.experienceMin) : null,
        experience_max: job.experienceMax !== undefined && job.experienceMax !== null ? Math.round(job.experienceMax) : null,
        salary_range: job.salaryRange || null,
        salary_amount: job.salaryAmount || null,
        salary_period: job.salaryPeriod || null,
        employment_type: job.employmentType || null,
        job_function: job.jobFunction || null,
        incentives: job.incentives || null,
        selection_process: job.selectionProcess || null,
        notes_highlights: job.notesHighlights || null,
        apply_link: applyLink,
        source_url: sourceLink || applyLink,
        custom_slug: job.customSlug || null,
        application_details: job.applicationDetails ? JSON.stringify(job.applicationDetails) : null,
        walk_in_details: job.walkInDetails ? JSON.stringify(job.walkInDetails) : null,
        status: 'PENDING_REVIEW'
    };

    try {
        console.log(`Saving to DB: ${job.title} @ ${job.company}`);

        // Check if job with this apply_link already exists in processed_jobs
        const { rows: existing } = await pool.query(
            `SELECT id FROM processed_jobs WHERE apply_link = $1 LIMIT 1`,
            [applyLink]
        );

        if (existing && existing.length > 0) {
            // Update existing job
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
                    structured_locations = $14,
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
                    application_details = $28,
                    walk_in_details = $29,
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
                    applyLink
                ]
            );
            console.log(`Updated existing job in DB successfully`);
        } else {
            // Insert new job
            await pool.query(
                `INSERT INTO processed_jobs (
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
                    $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
                    $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
                    $31, NOW(), NOW()
                )`,
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
                    payload.apply_link,
                    payload.source_url,
                    payload.custom_slug,
                    payload.application_details,
                    payload.walk_in_details,
                    payload.status
                ]
            );
            console.log(`Saved to DB successfully`);
        }

        return true;
    } catch (err: any) {
        console.error(`Failed to save job to DB:`, err.message || err);
        if (err.detail) console.error(`Detail:`, err.detail);
        if (err.hint) console.error(`Hint:`, err.hint);
        return false;
    }
}
