// ─── Enriched Job Payload Schema (adheres strictly to docs/data/templates.md) ───
// Types imported from @fresherflow/types — single source of truth across all apps.

export type { ApplicationDetails } from '@fresherflow/types';
export { OpportunityCategory, WorkMode, SalaryPeriod, EducationLevel as AllowedDegree } from '@fresherflow/types';

import { OpportunityCategory, WorkMode, SalaryPeriod, EducationLevel, ApplicationDetails } from '@fresherflow/types';

export interface EnrichedJobPayload {
    category: OpportunityCategory;
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
