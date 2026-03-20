"use strict";
// @fresherflow/domain — Profile Constants
// Shared across Web, API, and Mobile.
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEGREE_SPECIALIZATIONS = exports.PG_DEGREES = exports.UG_DEGREES = exports.DIPLOMA_DEGREES = exports.AVAILABILITY_OPTIONS = exports.COMMON_SKILLS = exports.INDIAN_CITIES = exports.WORK_MODES = exports.OPPORTUNITY_TYPES = exports.EDUCATION_LEVELS = exports.normalizeSkillName = exports.CANONICAL_SKILLS = exports.ALL_SPECIALIZATION_OPTIONS = exports.ALL_COURSE_OPTIONS = void 0;
const constants_1 = require("@fresherflow/constants");
Object.defineProperty(exports, "ALL_COURSE_OPTIONS", { enumerable: true, get: function () { return constants_1.ALL_COURSE_OPTIONS; } });
Object.defineProperty(exports, "ALL_SPECIALIZATION_OPTIONS", { enumerable: true, get: function () { return constants_1.ALL_SPECIALIZATION_OPTIONS; } });
Object.defineProperty(exports, "CANONICAL_SKILLS", { enumerable: true, get: function () { return constants_1.CANONICAL_SKILLS; } });
Object.defineProperty(exports, "normalizeSkillName", { enumerable: true, get: function () { return constants_1.normalizeSkillName; } });
exports.EDUCATION_LEVELS = ['DIPLOMA', 'DEGREE', 'PG'];
exports.OPPORTUNITY_TYPES = ['JOB', 'INTERNSHIP', 'WALKIN'];
exports.WORK_MODES = ['ONSITE', 'HYBRID', 'REMOTE'];
exports.INDIAN_CITIES = [
    'Bangalore', 'Mumbai', 'Delhi', 'Pune', 'Hyderabad', 'Chennai',
    'Kolkata', 'Ahmedabad', 'Gurugram', 'Noida', 'Chandigarh',
    'Jaipur', 'Kochi', 'Coimbatore', 'Indore', 'Bhopal', 'Lucknow',
    'Visakhapatnam', 'Nagpur', 'Surat', 'Vadodara', 'Mysore',
    'Mangalore', 'Goa', 'Thiruvananthapuram', 'Bhubaneswar',
    'Guwahati', 'Patna', 'Raipur', 'Dehradun'
];
const DATA_DRIVEN_PROFILE_SKILLS = [
    'python', 'java', 'sql', 'git', 'react', 'node.js', 'typescript',
    'spring boot', 'express.js', 'mongodb', 'postgresql', 'mysql',
    'docker', 'kubernetes', 'aws', 'go', 'c', 'c++', 'c#', 'linux',
    'bash', 'powershell', 'shell scripting', 'object oriented programming',
    'data structures', 'algorithms', 'problem solving', 'analytical skills',
    'analytical thinking', 'communication skills', 'interpersonal skills',
    'stakeholder communication', 'stakeholder management', 'teamwork',
    'time management', 'typing skills', 'debugging', 'software development',
    'software testing', 'quality assurance', 'manual testing', 'automation testing',
    'unit testing', 'api testing', 'rest apis', 'api development', 'api integration',
    'microservices', 'microservices architecture', 'ci/cd', 'jenkins', 'jira',
    'confluence', 'agile', 'agile/scrum', 'sdlc', 'data analysis', 'data analytics',
    'data visualization', 'data modeling', 'data pipelines', 'data warehousing',
    'data integration', 'data processing', 'data cleansing', 'tableau', 'power bi',
    'excel', 'advanced excel', 'pandas', 'numpy', 'scikit-learn', 'machine learning',
    'deep learning', 'nlp', 'rag', 'llms', 'generative ai', 'agentic ai',
    'pytorch', 'redis', 'kafka', 'snowflake', 'dynamodb', 'elasticsearch',
    'servicenow', 'salesforce', 'networking basics', 'tcp/ip', 'active directory',
    'it support', 'technical support', 'customer support', 'customer service',
    'voice process', 'non voice process', 'documentation', 'technical documentation',
    'reporting', 'dashboard development', 'ui/ux principles', 'responsive design',
    'next.js', 'php', 'django', 'postman', 'prompt engineering',
];
exports.COMMON_SKILLS = Array.from(new Set([
    ...constants_1.CANONICAL_SKILLS,
    ...DATA_DRIVEN_PROFILE_SKILLS.map((skill) => (0, constants_1.normalizeSkillName)(skill)).filter((s) => !!s),
]));
exports.AVAILABILITY_OPTIONS = [
    { value: 'IMMEDIATE', label: 'Within 7 Days' },
    { value: 'DAYS_15', label: '15 Days' },
    { value: 'MONTH_1', label: '30 Days' },
];
exports.DIPLOMA_DEGREES = [
    'Diploma in Computer Science', 'Diploma in IT', 'Diploma in Electronics',
    'Diploma in Mechanical', 'Diploma in Civil', 'Diploma in Electrical',
    'Diploma in Artificial Intelligence', 'Other'
];
exports.UG_DEGREES = [
    'B.Tech / B.E.', 'B.Sc', 'BCA', 'BBA', 'B.Com', 'B.A', 'B.Des',
    'B.Ed', 'B.Pharma', 'B.Voc', 'CA', 'Other',
];
exports.PG_DEGREES = [
    'M.Tech / M.E.', 'M.Sc', 'MCA', 'MBA', 'M.Com', 'M.A', 'MS',
    'PhD', 'Any Postgraduate', 'Other',
];
exports.DEGREE_SPECIALIZATIONS = {
    'B.Tech / B.E.': ['Computer Science', 'Information Technology', 'Electronics & Communication', 'Electrical & Electronics', 'Mechanical Engineering', 'Civil', 'AI/ML', 'Data Science', 'Cyber Security', 'Other'],
    'B.Sc': ['Computer Science', 'Physics', 'Mathematics', 'Chemistry', 'Information Technology', 'Data Science', 'Other'],
    'BCA': ['Software Development', 'Web Applications', 'Database Systems', 'Other'],
    'M.Tech / M.E.': ['Computer Science', 'VLSI Design', 'Cloud Computing', 'AI/ML', 'Data Science', 'Other'],
    'MCA': ['Computer Applications', 'Application Development', 'System Architecture', 'Cloud Tech', 'Other'],
    'MBA': ['Finance', 'Marketing', 'Human Resources', 'Operations', 'Business Analytics', 'Other'],
    default: [...constants_1.ALL_SPECIALIZATION_OPTIONS]
};
