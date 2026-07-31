/**
 * TypeScript interfaces for Jobvite public career site API responses.
 */

export interface JobviteResponse {
  requisitions: JobviteJob[];
  total?: number;
}

export interface JobviteJob {
  /** Unique job requisition ID */
  eId?: string | null;
  /** Job title */
  title?: string | null;
  /** Department name */
  department?: string | null;
  /** Category / team */
  category?: string | null;
  /** Location string (e.g. "San Francisco, CA") */
  location?: string | null;
  /** City */
  city?: string | null;
  /** State / region */
  state?: string | null;
  /** Country */
  country?: string | null;
  /** Job type (Full-Time, Part-Time, etc.) */
  type?: string | null;
  /** Date posted (ISO format or human-readable) */
  date?: string | null;
  /** Job description (HTML) */
  description?: string | null;
  /** Brief description / summary */
  briefDescription?: string | null;
  /** Application URL */
  applyUrl?: string | null;
  /** Job detail URL */
  detailUrl?: string | null;
  /** Requisition ID */
  requisitionId?: string | null;
}
