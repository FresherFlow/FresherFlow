export interface GetroOrganization {
  id?: number;
  name?: string;
  slug?: string;
  domain?: string;
  logo_url?: string;
  stage?: string;
  head_count?: number;
  topics?: string[];
  industry_tags?: string[];
  locations?: Array<string | { city?: string; state?: string; country?: string }>;
}

export interface GetroLocation {
  city?: string;
  state?: string;
  country?: string;
  text?: string;
}

export interface GetroJob {
  id: number | string;
  title: string;
  url?: string;
  apply_url?: string;
  description?: string;
  seniority?: string;
  employment_type?: string;
  work_mode?: string;
  skills?: string[];
  locations?: Array<string | GetroLocation>;
  organization?: GetroOrganization;
  created_at?: string;
  updated_at?: string;
}

export interface GetroSearchResponse {
  results?: {
    count?: number;
    jobs?: GetroJob[];
    companies?: GetroOrganization[];
  };
}
