export interface DiscoveredJob {
  id: string;
  runId?: string;
  company: string;
  title: string;
  location?: string;
  applyLink?: string;
  atsType?: string;
  status: 'DISCOVERED' | 'PROCESSING' | 'PROCESSED' | 'DUPLICATE' | 'REJECTED' | 'FAILED' | 'EXPIRED' | string;
  fresherScore?: number;
  createdAt?: string;
  // Fallbacks for API returning snake_case
  apply_link?: string;
  ats_type?: string;
  fresher_score?: number;
  created_at?: string;
  rawData?: any;
}

export interface DiscoveryRun {
  id: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  totalFound?: number;
  accepted?: number;
  reviewRequired?: number;
  duplicates?: number;
  failed?: number;
  status: 'COMPLETED' | 'RUNNING' | 'FAILED' | string;
  // Fallbacks for API returning snake_case
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  total_found?: number;
  review_required?: number;
}

export interface ProcessedJob {
  id: string;
  discoveredJobId?: string;
  type?: 'JOB' | 'INTERNSHIP' | string;
  title: string;
  company: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'PUBLISHED' | 'EXPIRED' | string;
  requiredSkills?: string[];
  locations?: string[];
  applyLink?: string;
  createdAt?: string;
  workMode?: 'REMOTE' | 'HYBRID' | 'ONSITE' | string;
  experienceMin?: number;
  experienceMax?: number;
  // Fallbacks for API returning snake_case
  experience_min?: number;
  experience_max?: number;
  work_mode?: string;
  required_skills?: string[];
  apply_link?: string;
  created_at?: string;
  rawData?: any;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  website: string;
  careersUrl: string;
  industry: string;
  size: string;
  verificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  active: boolean;
}

export interface CompanyATS {
  id: string;
  companyId: string;
  provider: string;
  careerUrl: string;
  health: 'HEALTHY' | 'DEGRADED' | 'FAILING' | 'UNKNOWN';
  enabled: boolean;
  lastSync: string;
  failureCount: number;
}

export interface CompanyStatistics {
  companyId: string;
  totalJobs: number;
  avgJobsPerMonth: number;
  lastHiringDate: string;
  freshersScore: number;
}

export interface IngestionTarget {
  company: string;
  ats: string;
  slug: string;
}

export interface PluginEntry {
  provider: string;
  providerName: string;
  hasDetailFetcher: boolean;
}

export interface NormalizedJob {
  title: string;
  company: string;
  company_website?: string | null;
  description?: string;
  apply_link: string;
  locations: string[];
  work_mode?: 'REMOTE' | 'HYBRID' | 'ONSITE' | null;
  required_skills: string[];
  experience_min: number;
  experience_max: number;
  salary_range: string;
  posted_at?: string | null;
  source_ats?: string | null;
  department?: string | null;
}

export interface RunResult {
  ats: string;
  slug: string;
  company: string;
  total: number;
  filtered: number;
  saved: number;
  skipped: number;
  durationMs: number;
  status: 'OK' | 'TIMEOUT' | 'ERROR';
  error?: string;
  jobs?: NormalizedJob[];
  dryRun?: boolean;
}

export interface RunLog {
  key: string;
  company: string;
  ats: string;
  result: RunResult;
  startedAt: string;
  isDryRun: boolean;
}

export interface TelemetryStats {
  totalTargets?: number;
  totalJobsIngested?: number;
  totalJobsSaved?: number;
  totalJobsSkipped?: number;
  totalRuns?: number;
  uptimeSeconds?: number;
  lastRunAt?: string;
  lastRun?: {
    accepted?: number;
    totalFound?: number;
    total_found?: number;
  };
  totalDiscovered?: number;
  configured?: boolean;
}

export interface Opportunity {
  id: string;
  title: string;
  company: string;
  applyLink: string;
  status: string;
  companyLogoUrl?: string;
  locations?: string[];
  workMode?: string;
  requiredSkills?: string[];
  createdAt?: string;
  source?: string;
  type?: string;
}

export type HashTab = 'queue' | 'connectors' | 'runs' | 'verified';

export type DiscoveryTab =
  | 'dashboard'
  | 'runs'
  | 'discovered'
  | 'processed'
  | 'companies'
  | 'adapters'
  | 'ats'
  | 'boards';
