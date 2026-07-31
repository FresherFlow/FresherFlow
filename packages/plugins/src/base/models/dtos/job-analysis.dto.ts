/**
 * Analytics DTOs for structured analysis output.
 */

/** Summary statistics for a set of job postings */
export class JobSummaryDto {
  totalJobs!: number;
  remoteCount!: number;
  remotePercentage!: number;
  withSalaryCount!: number;

  salaryStats?: {
    minSalary: number;
    maxSalary: number;
    avgSalary: number;
    currency: string;
  } | null;

  bySite!: Record<string, number>;
  byJobType!: Record<string, number>;
  byLocation!: Record<string, number>;

  constructor(partial?: Partial<JobSummaryDto>) {
    Object.assign(this, partial);
  }
}

/** Company insight for BD intelligence */
export class CompanyInsightDto {
  companyName!: string;
  openPositions!: number;
  locations!: string[];
  roles!: string[];
  emails!: string[];
  companyUrl?: string | null;

  constructor(partial?: Partial<CompanyInsightDto>) {
    Object.assign(this, partial);
  }
}

/** Per-site comparison metrics */
export class SiteComparisonDto {
  site!: string;
  totalJobs!: number;
  withSalary!: number;
  remoteJobs!: number;
  uniqueCompanies!: number;

  constructor(partial?: Partial<SiteComparisonDto>) {
    Object.assign(this, partial);
  }
}

/** Full analysis response combining all analytics */
export class JobAnalysisDto {
  summary!: JobSummaryDto;
  companies!: CompanyInsightDto[];
  siteComparison!: SiteComparisonDto[];

  constructor(partial?: Partial<JobAnalysisDto>) {
    Object.assign(this, partial);
  }
}
