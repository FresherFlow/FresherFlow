/**
 * TypeScript interfaces for Freshteam API responses.
 *
 * @see https://developers.freshteam.com/api/#job_postings
 */

export interface FreshteamJobPosting {
  id: number;
  title: string;
  description: string;
  department: string | null;
  branch: string | null;
  type: string | null;
  remote: boolean;
  closing_date: string | null;
  created_at: string;
  applicant_apply_link: string | null;
}
