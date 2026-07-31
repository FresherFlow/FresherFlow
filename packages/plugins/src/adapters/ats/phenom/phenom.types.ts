/**
 * TypeScript interfaces for Phenom People ATS API responses.
 */

export interface PhenomLocation {
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zipCode?: string | null;
  address?: string | null;
}

export interface PhenomJob {
  /** Unique job identifier */
  id?: string | number | null;
  /** External or requisition ID */
  reqId?: string | null;
  /** Job title */
  title?: string | null;
  /** HTML or plain text description */
  description?: string | null;
  /** Short description / summary */
  shortDescription?: string | null;
  /** Structured location */
  location?: PhenomLocation | null;
  /** Location as display string */
  locationText?: string | null;
  /** Department name */
  department?: string | null;
  /** Category / job family */
  category?: string | null;
  /** Employment type (e.g., Full-Time, Part-Time) */
  type?: string | null;
  /** Employment type alternate field name */
  employmentType?: string | null;
  /** Date the job was posted (ISO string or epoch) */
  postedDate?: string | number | null;
  /** Alternate posted date field */
  posted_date?: string | number | null;
  /** Date the job was created */
  createdDate?: string | number | null;
  /** Direct URL to the job posting */
  url?: string | null;
  /** Alternate URL field */
  applyUrl?: string | null;
  /** Company name */
  companyName?: string | null;
  /** Whether the job is remote */
  isRemote?: boolean | null;
  /** Remote work type string */
  workplaceType?: string | null;
  /** Experience level */
  experienceLevel?: string | null;
}

export interface PhenomResponse {
  /** Array of job postings */
  jobs: PhenomJob[];
  /** Total number of jobs available */
  total?: number | null;
  /** Total count alternate field */
  totalCount?: number | null;
  /** Current page offset */
  offset?: number | null;
  /** Page size / limit */
  limit?: number | null;
}
