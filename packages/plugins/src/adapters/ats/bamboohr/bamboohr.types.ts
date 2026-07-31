/**
 * TypeScript interfaces for BambooHR public careers API responses.
 */

export interface BambooHRResponse {
  result: BambooHRJob[];
}

/** Structured location used by both the list and the detail payloads. */
export interface BambooHRLocation {
  city: string | null;
  state: string | null;
  postalCode?: string | null;
  addressCountry?: string | null;
}

/** Country/region info carried alongside `location` (where country actually lives). */
export interface BambooHRAtsLocation {
  country: string | null;
  countryId?: string | null;
  state: string | null;
  province?: string | null;
  city: string | null;
}

/**
 * A row from the public `/careers/list` feed. This is sparse: it carries no
 * posting body, compensation, or datePosted (those live only on the per-job
 * `/careers/{id}/detail` endpoint — see {@link BambooHRJobDetail}). `id` is a
 * string in the live payload despite the authenticated API using a number.
 * `locationType` encodes work mode: 0 = on-site, 1 = remote, 2 = hybrid.
 */
export interface BambooHRJob {
  id: string | number;
  jobOpeningName: string;
  departmentLabel: string | null;
  location: BambooHRLocation | null;
  atsLocation: BambooHRAtsLocation | null;
  employmentStatusLabel: string | null;
  locationType: string | number | null;
  isRemote: boolean | null;
}

/** The `result.jobOpening` object from `/careers/{id}/detail`. */
export interface BambooHRJobDetail {
  id?: string | number;
  jobOpeningName?: string | null;
  departmentLabel?: string | null;
  location: BambooHRLocation | null;
  atsLocation: BambooHRAtsLocation | null;
  employmentStatusLabel?: string | null;
  locationType?: string | number | null;
  isRemote?: boolean | null;
  description: string | null;
  compensation: string | null;
  minimumExperience?: string | null;
  datePosted: string | null;
  jobOpeningShareUrl?: string | null;
}

/** Envelope returned by `/careers/{id}/detail`. */
export interface BambooHRDetailResponse {
  result?: {
    jobOpening?: BambooHRJobDetail | null;
  } | null;
}

/**
 * TypeScript interfaces for BambooHR authenticated Applicant Tracking API responses.
 * Uses the Job Summaries endpoint which returns job openings directly.
 *
 * @see https://documentation.bamboohr.com/reference/get-job-summaries
 */

export interface BambooHRApiJobOpening {
  id: number;
  title: string | null;
  department: {
    id: number;
    label: string;
  } | null;
  location: {
    city: string | null;
    state: string | null;
    country: string | null;
  } | null;
  status: {
    id: number;
    label: string;
  } | null;
  employmentStatus: string | null;
  description: string | null;
  compensation: string | null;
  minimumExperience: string | null;
  jobOpeningUrl: string | null;
  dateCreated: string | null;
  numberOfOpenings: number | null;
}

export interface BambooHRApiResponse {
  jobOpenings: BambooHRApiJobOpening[];
}

/**
 * @deprecated Kept for backward compatibility. Use BambooHRApiJobOpening instead.
 */
export type BambooHRApiApplication = BambooHRApiJobOpening;
