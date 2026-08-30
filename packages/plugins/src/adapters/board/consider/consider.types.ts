export interface ConsiderJob {
  id?: string | number;
  jobId?: string | number;
  title: string;
  url?: string;
  applyUrl?: string;
  jobUrl?: string;
  description?: string;
  locations?: string[];
  location?: string;
  company?: {
    name?: string;
    description?: string;
    logo?: string;
    domain?: string;
  };
  companyName?: string;
  companySlug?: string;
  companyDomain?: string;
  companyStaffCount?: number;
  companyLogos?: {
    manual?: { src?: string; width?: number; height?: number };
    linkedin?: { src?: string; width?: number; height?: number };
  };
  parentName?: string;
  jobType?: string;
  employmentType?: string;
  minYearsExp?: number;
  remote?: boolean;
  hybrid?: boolean;
  skills?: Array<string | { id?: string; label?: string; value?: string }>;
  requiredSkills?: Array<{ id?: string; label?: string; value?: string }>;
  preferredSkills?: Array<{ id?: string; label?: string; value?: string }>;
  markets?: Array<{ id?: string; label?: string; value?: string }>;
  stages?: Array<{ id?: string; label?: string; value?: string }>;
  jobFunctions?: Array<{ id?: string; label?: string; value?: string }>;
  jobTypes?: Array<{ id?: string; label?: string; value?: string }>;
  jobSeniorities?: Array<{ id?: string; label?: string; value?: string }>;
  salary?: {
    minValue?: number;
    maxValue?: number;
    currency?: { label?: string; value?: string };
    period?: { label?: string; value?: string };
  };
  timeStamp?: string;
  createdAt?: string | number;
  postedAt?: string | number;
}
