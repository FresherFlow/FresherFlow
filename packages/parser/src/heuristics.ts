/**
 * Static dictionaries and heuristics used by extraction & normalization.
 * Centralized here so every module reads from one source of truth.
 */

export const STOP_WORDS = new Set([
    'requirements', 'eligibility', 'apply', 'link', 'official', 'company',
    'hiring', 'salary', 'posted', 'openings', 'applicants', 'save',
    'interested', 'reviews', 'match', 'score', 'early', 'applicant',
    'follow', 'stay', 'updated', 'logo', 'send', 'jobs', 'like', 'this',
    'highlights', 'perks', 'benefits', 'details', 'responsibilities',
    'description', 'carry', 'resume', 'aadhar', 'card', 'mention',
    'coming', 'festive', 'dates', 'saturday', 'sunday', 'monday',
    'tuesday', 'wednesday', 'thursday', 'friday', 'skip to main content',
    'join the conversation', 'careers homepage', 'global careers',
]);

export const NAV_PATTERNS = [
    /Skip to Main Content/gi, /JOIN THE CONVERSATION/gi, /Careers Homepage/gi,
    /Global Careers/gi, /^Apply$/gm, /^Home$/gm, /Who We Are/gi,
    /Life at .+/gi, /Career Areas/gi, /Join Our Talent Community/gi,
    /Search Jobs/gi, /View All Jobs/gi, /Back to Search/gi,
];

export const GENERIC_TITLES = new Set([
    'associate', 'senior', 'junior', 'lead', 'trainee', 'representative',
    'specialist', 'analyst', 'candidate', 'associate senior', 'immediate joiner',
]);

export const COMMON_SKILLS = [
    // Languages
    'javascript', 'typescript', 'python', 'java', 'c#', 'c++', 'ruby', 'php',
    'swift', 'kotlin', 'go', 'rust', 'scala', 'r',
    // Frontend
    'react', 'angular', 'vue', 'next.js', 'nuxt', 'svelte', 'jquery',
    'bootstrap', 'tailwind', 'html', 'css', 'sass', 'redux',
    // Backend
    'node', 'node.js', 'express', 'django', 'flask', 'fastapi', 'spring', 'asp.net',
    'laravel', 'rails', '.net',
    // Databases
    'sql', 'nosql', 'mongodb', 'postgresql', 'mysql', 'redis', 'cassandra',
    'dynamodb', 'elasticsearch',
    // Cloud & DevOps
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'gitlab',
    'github', 'ci/cd', 'terraform', 'ansible',
    // Tools & Misc
    'git', 'rest', 'graphql', 'kafka', 'rabbitmq', 'oauth', 'jwt',
    'agile', 'scrum', 'jira', 'selenium', 'jest', 'linux', 'bash',
    'itil', 'active directory', 'itsm', 'service desk', 'troubleshooting',
    'vpn', 'networking', 'customer support', 'voice process', 'technical support',
    'service-now', 'o365', 'outlook', 'windows os', 'remedy',
];

export const COMMON_CITIES = [
    'Hyderabad', 'Bangalore', 'Bengaluru', 'Mumbai', 'Delhi', 'Pune',
    'Chennai', 'Gurgaon', 'Gurugram', 'Noida', 'Kolkata', 'Ahmedabad',
    'Jaipur', 'Kochi', 'Indore', 'Chandigarh',
];

export const KNOWN_COMPANIES = [
    'Tech Mahindra', 'TCS', 'Infosys', 'Wipro', 'Accenture',
    'Cognizant', 'HCL', 'Capgemini', 'IBM',
];

export const TITLE_KEYWORDS = [
    'Engineer', 'Developer', 'Manager', 'Designer', 'Analyst', 'Specialist',
    'Lead', 'Architect', 'Director', 'Consultant', 'Administrator', 'Scientist',
    'Coordinator', 'Executive', 'Associate', 'Assistant', 'Officer',
    'Representative', 'Agent',
];

export const MONTH_INDEX: Record<string, number> = {
    jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
    apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
    aug: 7, august: 7, sep: 8, sept: 8, september: 8,
    oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
};

/** Split camelCase/PascalCase merged words into separate tokens */
export function splitMergedWords(text: string): string[] {
    let cleaned = text.replace(/([a-z])([A-Z][a-z])/g, '$1 $2');
    cleaned = cleaned.replace(/([a-zA-Z])([A-Z][a-z])/g, '$1 $2');
    cleaned = cleaned.replace(/([A-Z][a-z]+)([A-Z][a-z]+)/g, '$1 $2');
    return cleaned.split(/\s+/).filter(w => w.length > 0);
}

/** Predicate: is this string a plausible skill token? */
export function isValidSkill(s: string): boolean {
    const low = s.toLowerCase();
    const wordCount = s.split(/\s+/).length;
    return (
        s.length > 2 && s.length < 50 && wordCount <= 4 &&
        !STOP_WORDS.has(low) && !GENERIC_TITLES.has(low) &&
        !low.includes('match score') && !low.includes('applicants') &&
        !low.includes('career') && !low.includes('job') &&
        !low.includes('logo') && !low.includes('reviews') &&
        !low.includes('queries') && !low.includes('issues') &&
        !low.includes('documentation')
    );
}
