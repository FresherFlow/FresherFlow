import { OpportunityType, WorkMode, SalaryPeriod } from '@fresherflow/types';

/** Shared output types for the @fresherflow/parser package. */

export interface ParsedJob {
    company?: string;
    title?: string;
    locations: string[];
    skills: string[];
    type: OpportunityType;
    allowedPassoutYears: number[];
    isFresherOnly: boolean;
    allowedDegrees: string[];
    isRemote: boolean;
    workMode: WorkMode;
    jobFunction?: string;
    incentives?: string;
    salaryPeriod?: SalaryPeriod;
    salaryMin?: number;
    salaryMax?: number;
    salaryRange?: string;
    experienceMin?: number;
    experienceMax?: number;
    dateRange?: string;
    timeRange?: string;
    venueLink?: string;
    venueAddress?: string;
    expiresAt?: string;
    description?: string;
}

export interface NormalizedSalary {
    min?: number;
    max?: number;
    period: SalaryPeriod;
    /** Human-readable e.g. "6-8 LPA" or "₹25k/month" */
    range?: string;
}
