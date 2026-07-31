/**
 * TypeScript interfaces for SAP SuccessFactors OData API responses.
 */

export interface SfJobPosting {
  jobReqId?: string | null;
  jobTitle?: string | null;
  jobDescription?: string | null;
  locationObj?: {
    city?: string | null;
    state?: string | null;
    country?: string | null;
  } | null;
  locationObjlist?: Array<{
    city?: string | null;
    state?: string | null;
    country?: string | null;
  }> | null;
  department?: string | null;
  division?: string | null;
  postingStartDate?: string | null;
  postingEndDate?: string | null;
  jobType?: string | null;
  employmentType?: string | null;
  companyName?: string | null;
  externalJobUrl?: string | null;
  formattedJobTitle?: string | null;
}

export interface SfODataResponse {
  d?: {
    results?: SfJobPosting[];
    __count?: string;
    __next?: string;
  };
}
