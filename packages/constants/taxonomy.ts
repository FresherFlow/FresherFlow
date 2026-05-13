import { OpportunityType } from '@fresherflow/types';

/**
 * Broad + Stable Categories (The Nature of the Opportunity)
 */
export const CORE_CATEGORIES = [
    OpportunityType.JOB,
    OpportunityType.INTERNSHIP,
    OpportunityType.WALKIN,
    OpportunityType.REMOTE,
    OpportunityType.GOVERNMENT,
    OpportunityType.HACKATHONS,
];

/**
 * Controlled Tag System (The Meta-data layer)
 * These are suggested to users/admins to avoid duplicate or garbage tags.
 */
export const CONTROLLED_TAGS = {
    BATCHES: ['2026 Batch', '2025 Batch', '2024 Batch', '2023 Batch'],
    LOCATIONS: ['Hyderabad', 'Bengaluru', 'Pune', 'Noida', 'Chennai', 'Mumbai', 'Remote'],
    ROLES: ['Frontend', 'Backend', 'Full Stack', 'AI/ML', 'Data Science', 'Mobile', 'UI/UX', 'DevOps'],
    SKILLS: ['React', 'Node.js', 'Python', 'Java', 'C++', 'JavaScript', 'SQL', 'Flutter'],
};

/**
 * Mapping for display labels
 */
export const CATEGORY_LABELS: Record<string, string> = {
    [OpportunityType.JOB]: 'Jobs',
    [OpportunityType.INTERNSHIP]: 'Internships',
    [OpportunityType.WALKIN]: 'Walk-ins',
    [OpportunityType.REMOTE]: 'Remote Only',
    [OpportunityType.GOVERNMENT]: 'Govt Jobs',
    [OpportunityType.HACKATHONS]: 'Hackathons',
};
