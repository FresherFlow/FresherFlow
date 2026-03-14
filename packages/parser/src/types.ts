/** Shared output types for the @fresherflow/parser package. */

export interface ParsedJob {
    company?: string;
    title?: string;
    locations: string[];
    skills: string[];
    type: 'JOB' | 'INTERNSHIP' | 'WALKIN';
    allowedPassoutYears: number[];
    isFresherOnly: boolean;
    allowedDegrees: string[];
    isRemote: boolean;
    workMode: 'REMOTE' | 'HYBRID' | 'ONSITE';
    jobFunction?: string;
    incentives?: string;
    salaryPeriod?: 'MONTHLY' | 'YEARLY';
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
    period: 'MONTHLY' | 'YEARLY';
    /** Human-readable e.g. "6-8 LPA" or "₹25k/month" */
    range?: string;
}
