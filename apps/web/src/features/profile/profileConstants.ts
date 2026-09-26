import {
    ALL_COURSE_OPTIONS,
    ALL_SPECIALIZATION_OPTIONS,
    CANONICAL_SKILLS,
    normalizeCourseName,
    normalizeSpecializationName,
    normalizeSkillName,
    INDIAN_CITIES,
    INDIAN_STATES,
} from '@fresherflow/constants';
import { OpportunityCategory } from '@fresherflow/types';
export {
    ALL_COURSE_OPTIONS,
    ALL_SPECIALIZATION_OPTIONS,
    CANONICAL_SKILLS,
    normalizeCourseName,
    normalizeSpecializationName,
    normalizeSkillName,
    INDIAN_CITIES,
    INDIAN_STATES,
};

export const EDUCATION_LEVELS = ['TENTH', 'INTER', 'DIPLOMA', 'DEGREE', 'PG'];
// `interestedIn` is OpportunityCategory[] on the API — the old
// JOB / INTERNSHIP / WALKIN values no longer validate.
export const OPPORTUNITY_TYPES = [
    OpportunityCategory.EMPLOYMENT,
    OpportunityCategory.COMPETITION,
    OpportunityCategory.SCHOLARSHIP,
    OpportunityCategory.EDUCATION,
    OpportunityCategory.EVENT,
];
export const WORK_MODES = ['ONSITE', 'HYBRID', 'REMOTE'];

/**
 * Ceiling for the skills editor.
 *
 * A rule, not a style value, so it does not live in the section that happens to render it.
 * The section imports it, the toggle rule in `skills.ts` enforces it.
 */
export const MAX_SKILLS = 10;

const DATA_DRIVEN_PROFILE_SKILLS = [
    'python',
    'java',
    'sql',
    'git',
    'react',
    'node.js',
    'typescript',
    'spring boot',
    'express.js',
    'mongodb',
    'postgresql',
    'mysql',
    'docker',
    'kubernetes',
    'aws',
    'go',
    'c',
    'c++',
    'c#',
    'linux',
    'bash',
    'powershell',
    'shell scripting',
    'object oriented programming',
    'data structures',
    'algorithms',
    'problem solving',
    'analytical skills',
    'analytical thinking',
    'communication skills',
    'interpersonal skills',
    'stakeholder communication',
    'stakeholder management',
    'teamwork',
    'time management',
    'typing skills',
    'debugging',
    'software development',
    'software testing',
    'quality assurance',
    'manual testing',
    'automation testing',
    'unit testing',
    'api testing',
    'rest apis',
    'api development',
    'api integration',
    'microservices',
    'microservices architecture',
    'ci/cd',
    'jenkins',
    'jira',
    'confluence',
    'agile',
    'agile/scrum',
    'sdlc',
    'data analysis',
    'data analytics',
    'data visualization',
    'data modeling',
    'data pipelines',
    'data warehousing',
    'data integration',
    'data processing',
    'data cleansing',
    'tableau',
    'power bi',
    'excel',
    'advanced excel',
    'pandas',
    'numpy',
    'scikit-learn',
    'machine learning',
    'deep learning',
    'nlp',
    'rag',
    'llms',
    'generative ai',
    'agentic ai',
    'pytorch',
    'redis',
    'kafka',
    'snowflake',
    'dynamodb',
    'elasticsearch',
    'servicenow',
    'salesforce',
    'networking basics',
    'tcp/ip',
    'active directory',
    'it support',
    'technical support',
    'customer support',
    'customer service',
    'voice process',
    'non voice process',
    'documentation',
    'technical documentation',
    'reporting',
    'dashboard development',
    'ui/ux principles',
    'responsive design',
    'next.js',
    'php',
    'django',
    'postman',
    'prompt engineering',
];

export const COMMON_SKILLS = Array.from(
    new Set([
        ...CANONICAL_SKILLS,
        ...DATA_DRIVEN_PROFILE_SKILLS.map((skill) => normalizeSkillName(skill)).filter(Boolean),
    ])
);

export const AVAILABILITY_OPTIONS = [
    { value: 'IMMEDIATE', label: 'Within 7 Days' },
    { value: 'DAYS_15', label: '15 Days' },
    { value: 'MONTH_1', label: '30 Days' },
];

/* The degree and specialization lists (DIPLOMA_DEGREES, UG_DEGREES, PG_DEGREES,
   getSpecializations) used to be duplicated here as well as in
   `@fresherflow/utils`. Every consumer already imports them from the package, so
   the copies were dead — deleted rather than kept as a second home. */
