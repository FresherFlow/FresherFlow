import {
    ALL_COURSE_OPTIONS,
    ALL_SPECIALIZATION_OPTIONS,
    CANONICAL_SKILLS,
    normalizeCourseName,
    normalizeSpecializationName,
    normalizeSkillName,
    INDIAN_CITIES,
} from '@fresherflow/constants';
export {
    ALL_COURSE_OPTIONS,
    ALL_SPECIALIZATION_OPTIONS,
    CANONICAL_SKILLS,
    normalizeCourseName,
    normalizeSpecializationName,
    normalizeSkillName,
    INDIAN_CITIES,
};

export const EDUCATION_LEVELS = ['TENTH', 'INTER', 'DIPLOMA', 'DEGREE', 'PG'];
export const OPPORTUNITY_TYPES = ['JOB', 'INTERNSHIP', 'WALKIN'];
export const WORK_MODES = ['ONSITE', 'HYBRID', 'REMOTE'];

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

export const DIPLOMA_DEGREES = [
    'Diploma in Computer Science', 'Diploma in IT', 'Diploma in Electronics',
    'Diploma in Mechanical', 'Diploma in Civil', 'Diploma in Electrical',
    'Diploma in Artificial Intelligence', 'Other'
];

export const UG_DEGREES = [
    'B.Tech / B.E.',
    'B.Sc',
    'BCA',
    'BBA',
    'B.Com',
    'B.A',
    'B.Des',
    'B.Ed',
    'B.Pharma',
    'B.Voc',
    'CA',
    'Other',
];

export const PG_DEGREES = [
    'M.Tech / M.E.',
    'M.Sc',
    'MCA',
    'MBA',
    'M.Com',
    'M.A',
    'MS',
    'PhD',
    'Any Postgraduate',
    'Other',
];

export const DEGREE_SPECIALIZATIONS: Record<string, string[]> = {
    'B.Tech / B.E.': ['Computer Science', 'Information Technology', 'Electronics & Communication', 'Electrical & Electronics', 'Mechanical Engineering', 'Civil', 'AI/ML', 'Data Science', 'Cyber Security', 'Other'],
    'B.Sc': ['Computer Science', 'Physics', 'Mathematics', 'Chemistry', 'Information Technology', 'Data Science', 'Other'],
    'BCA': ['Software Development', 'Web Applications', 'Database Systems', 'Other'],
    'M.Tech / M.E.': ['Computer Science', 'VLSI Design', 'Cloud Computing', 'AI/ML', 'Data Science', 'Other'],
    'MCA': ['Computer Applications', 'Application Development', 'System Architecture', 'Cloud Tech', 'Other'],
    'MBA': ['Finance', 'Marketing', 'Human Resources', 'Operations', 'Business Analytics', 'Other'],
    default: [...ALL_SPECIALIZATION_OPTIONS]
};

export function getSpecializations(course: string): string[] {
    const normalizedCourse = normalizeCourseName(course);
    return DEGREE_SPECIALIZATIONS[normalizedCourse] ?? DEGREE_SPECIALIZATIONS.default;
}
