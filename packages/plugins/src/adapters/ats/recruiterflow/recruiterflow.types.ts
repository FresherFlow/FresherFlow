/**
 * TypeScript interfaces for Recruiterflow API responses.
 */

export interface RecruiterflowJob {
  id: number;
  title: string;
  description: string | null;
  location: string | null;
  status: string | null;
  created_at: string | null;
}

export interface RecruiterflowApiResponse {
  data: RecruiterflowJob[];
  total_items: number;
}
