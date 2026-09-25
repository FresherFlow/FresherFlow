import { OpportunityCategory, EmploymentType, RecruitmentMethod, WorkMode } from '@fresherflow/types';

/**
 * Broad + Stable Categories (The Nature of the Opportunity)
 */
export const CORE_CATEGORIES = {
    opportunityCategories: [OpportunityCategory.EMPLOYMENT, OpportunityCategory.COMPETITION, OpportunityCategory.SCHOLARSHIP, OpportunityCategory.EDUCATION, OpportunityCategory.EVENT] as const,
    employmentTypes: [EmploymentType.FULL_TIME, EmploymentType.PART_TIME, EmploymentType.CONTRACT, EmploymentType.INTERNSHIP, EmploymentType.APPRENTICESHIP] as const,
    recruitmentMethods: [RecruitmentMethod.REGULAR, RecruitmentMethod.WALK_IN, RecruitmentMethod.ON_CAMPUS, RecruitmentMethod.OFF_CAMPUS, RecruitmentMethod.POOL_CAMPUS, RecruitmentMethod.REFERRAL] as const,
    workModes: [WorkMode.ONSITE, WorkMode.HYBRID, WorkMode.REMOTE] as const,
};

/**
 * Controlled Tag System (The Meta-data layer)
 * These are suggested to users/admins to avoid duplicate or garbage tags.
 */
import { INDIAN_CITIES } from './locationTaxonomy.js';

export const CONTROLLED_TAGS = {
    BATCHES: ['2026 Batch', '2025 Batch', '2024 Batch', '2023 Batch'],
    LOCATIONS: ['Remote', ...INDIAN_CITIES.slice(0, 10)],
    ROLES: ['Frontend', 'Backend', 'Full Stack', 'AI/ML', 'Data Science', 'Mobile', 'UI/UX', 'DevOps'],
    SKILLS: ['React', 'Node.js', 'Python', 'Java', 'C++', 'JavaScript', 'SQL', 'Flutter'],
};

/**
 * Mapping for display labels
 */
export const CATEGORY_LABELS: Record<string, string> = {
    [OpportunityCategory.EMPLOYMENT]: 'Jobs',
    [OpportunityCategory.COMPETITION]: 'Competitions',
    [OpportunityCategory.SCHOLARSHIP]: 'Scholarships',
    [OpportunityCategory.EDUCATION]: 'Education',
    [OpportunityCategory.EVENT]: 'Events',
    [EmploymentType.FULL_TIME]: 'Full-time',
    [EmploymentType.PART_TIME]: 'Part-time',
    [EmploymentType.CONTRACT]: 'Contract',
    [EmploymentType.INTERNSHIP]: 'Internships',
    [EmploymentType.APPRENTICESHIP]: 'Apprenticeships',
    [RecruitmentMethod.WALK_IN]: 'Walk-ins',
    [WorkMode.REMOTE]: 'Remote Only',
    [WorkMode.HYBRID]: 'Hybrid',
    [WorkMode.ONSITE]: 'On-site',
};

