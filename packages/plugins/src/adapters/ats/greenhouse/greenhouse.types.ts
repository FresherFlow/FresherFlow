/**
 * TypeScript interfaces for Greenhouse API responses.
 * Ported from ats-scrapers/models/gh.py
 */

export interface GreenhouseLocation {
  name?: string | null;
}

export interface GreenhouseDepartment {
  id?: number | null;
  name?: string | null;
  child_ids?: number[] | null;
  parent_id?: number | null;
}

export interface GreenhouseOffice {
  id?: number | null;
  name?: string | null;
  location?: string | null;
  child_ids?: number[] | null;
  parent_id?: number | null;
}

export interface GreenhouseMetadataItem {
  id?: number | null;
  name?: string | null;
  value?: string | string[] | Record<string, unknown> | boolean | null;
  value_type?: string | null;
}

export interface GreenhouseJob {
  absolute_url?: string | null;
  internal_job_id?: number | null;
  location?: GreenhouseLocation | null;
  metadata?: GreenhouseMetadataItem[] | null;
  id?: number | null;
  updated_at?: string | null;
  requisition_id?: string | null;
  title?: string | null;
  company_name?: string | null;
  first_published?: string | null;
  content?: string | null;
  departments?: GreenhouseDepartment[] | null;
  offices?: GreenhouseOffice[] | null;
}

export interface GreenhouseResponse {
  jobs: GreenhouseJob[];
}

// ─── Harvest API Types ──────────────────────────────────────────────

/**
 * Office object returned by the Greenhouse Harvest API.
 * Contains richer data than the public board API, including
 * full address components.
 */
export interface GreenhouseHarvestOffice {
  id?: number | null;
  name?: string | null;
  location?: {
    name?: string | null;
  } | null;
  primary_contact_user_id?: number | null;
  parent_id?: number | null;
}

/**
 * Department object returned by the Greenhouse Harvest API.
 */
export interface GreenhouseHarvestDepartment {
  id?: number | null;
  name?: string | null;
  parent_id?: number | null;
  child_ids?: number[] | null;
  external_id?: string | null;
}

/**
 * Custom field ("keyed_custom_field") on a Harvest API job.
 */
export interface GreenhouseHarvestCustomField {
  name?: string | null;
  type?: string | null;
  value?: string | number | boolean | null;
}

/**
 * A single job object from the Greenhouse Harvest API
 * (`GET /v1/jobs`).
 *
 * @see https://developers.greenhouse.io/harvest.html#the-job-object
 */
export interface GreenhouseHarvestJob {
  id?: number | null;
  name?: string | null;
  requisition_id?: string | null;
  notes?: string | null;
  confidential?: boolean | null;
  status?: string | null;
  created_at?: string | null;
  opened_at?: string | null;
  closed_at?: string | null;
  updated_at?: string | null;
  is_template?: boolean | null;
  departments?: GreenhouseHarvestDepartment[] | null;
  offices?: GreenhouseHarvestOffice[] | null;
  custom_fields?: Record<string, unknown> | null;
  keyed_custom_fields?: Record<string, GreenhouseHarvestCustomField> | null;
}
