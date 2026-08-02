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
  apply_link: string;
  locations: string[];
  work_mode: string | null;
  required_skills: string[];
  experience_min: number;
  experience_max: number;
  salary_range: string;
  posted_at: string | null;
  department: string | null;
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
  totalJobsIngested?: number;
  totalJobsSaved?: number;
  totalJobsSkipped?: number;
  totalRuns?: number;
  uptimeSeconds?: number;
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
export type ConnectorSubTab = 'companies' | 'boards' | 'adapters';
