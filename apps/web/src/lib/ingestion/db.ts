import { NextResponse } from 'next/server';
import { pool, hasDb } from '@fresherflow/pipeline';

export const hasIngestionDb = hasDb;

export async function queryRows<T>(query: string, params: unknown[] = []): Promise<T[]> {
  const result = await pool.query(query, params);
  return result.rows as T[];
}

export async function execute(query: string, params: unknown[] = []): Promise<number> {
  const result = await pool.query(query, params);
  return result.rowCount ?? 0;
}

export const PROCESSED_JOB_COLUMNS = [
  'id',
  'discovered_job_id as "discoveredId"',
  'title',
  'company',
  'company_website as "companyWebsite"',
  'company_logo_url as "companyLogoUrl"',
  'description',
  'type',
  'locations',
  'structured_locations as "structuredLocations"',
  'required_skills as "requiredSkills"',
  'allowed_degrees as "allowedDegrees"',
  'allowed_courses as "allowedCourses"',
  'allowed_specializations as "allowedSpecializations"',
  'allowed_passout_years as "allowedPassoutYears"',
  'work_mode as "workMode"',
  'experience_min as "experienceMin"',
  'experience_max as "experienceMax"',
  'salary_range as "salaryRange"',
  'salary_period as "salaryPeriod"',
  'employment_type as "employmentType"',
  'job_function as "jobFunction"',
  'apply_link as "applyLink"',
  'source_url as "sourceUrl"',
  'incentives',
  'selection_process as "selectionProcess"',
  'notes_highlights as "notesHighlights"',
  'application_details as "applicationDetails"',
  'walk_in_details as "walkInDetails"',
  'status',
  'created_at as "createdAt"',
  'updated_at as "updatedAt"'
].join(', ');

const DB_NOT_CONFIGURED_BODY = {
  error: 'Ingestion database is not configured',
  hint: 'Set INGESTION_DATABASE_URL (or STAGING_DATABASE_URL / DATABASE_URL) on the web app to read ingestion data directly.',
};

export function ingestionDbError(): NextResponse {
  return NextResponse.json(
    hasIngestionDb ? { error: 'Ingestion database unreachable' } : DB_NOT_CONFIGURED_BODY,
    { status: 503 }
  );
}