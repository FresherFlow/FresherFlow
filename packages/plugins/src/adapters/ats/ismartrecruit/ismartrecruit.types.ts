/**
 * TypeScript interfaces for iSmartRecruit API responses.
 */

export interface ISmartRecruitJob {
  jobId: string;
  jobTitle: string;
  city: string | null;
  country: string | null;
  jobCategory: string | null;
  datePosted: string | null;
  description: string | null;
  applyUrl: string | null;
  companyName: string | null;
}
