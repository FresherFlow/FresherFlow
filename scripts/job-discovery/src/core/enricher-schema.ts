// ─── Enriched Job Payload Schema (adheres strictly to docs/data/templates.md) ───
// Types imported from @fresherflow/types — single source of truth across all apps.

export type { ApplicationDetails } from '@fresherflow/types';
export { OpportunityType as JobType, WorkMode, SalaryPeriod, EducationLevel as AllowedDegree } from '@fresherflow/types';

import { OpportunityType, WorkMode, SalaryPeriod, EducationLevel, ApplicationDetails } from '@fresherflow/types';

export interface EnrichedJobPayload {
    type: OpportunityType;
    title: string;
    company: string;
    companyWebsite?: string;
    description: string;
    allowedDegrees: EducationLevel[];
    allowedCourses: string[];
    allowedSpecializations: string[];
    allowedPassoutYears: number[];
    requiredSkills: string[];
    locations: string[];
    workMode: WorkMode;
    experienceMin: number;
    experienceMax: number;
    salaryRange?: string;
    salaryAmount?: string;
    salaryPeriod?: SalaryPeriod;
    employmentType?: string;
    jobFunction?: string;
    incentives?: string;
    selectionProcess?: string;
    notesHighlights?: string;
    applyLink: string;
    customSlug?: string;
    expiresAt?: string;
    applicationDetails: ApplicationDetails | null;
}
