/**
 * Lightweight browser-safe job text parser for the web UI.
 *
 * NOTE: The canonical, full-featured parser (with NLP, TF-IDF, etc.)
 * lives in packages/parser and is for server-side use only (Node.js).
 * This module is intentionally kept dependency-free for the browser.
 */

export interface ParsedJob {
    title: string;
    company: string;
    location: string;
    skills: string;
    workMode: 'ONSITE' | 'HYBRID' | 'REMOTE';
    degrees: string[];
    passoutYears: number[];
    description?: string;
}

const NAV_PATTERNS = [
    /Skip to Main Content/gi, /JOIN THE CONVERSATION/gi, /Careers Homepage/gi,
    /Global Careers/gi, /^Apply$/gm, /^Home$/gm, /Who We Are/gi,
    /Life at .+/gi, /Career Areas/gi, /Join Our Talent Community/gi,
    /Search Jobs/gi, /View All Jobs/gi, /Back to Search/gi,
];

const TITLE_KEYWORDS = [
    'Engineer', 'Developer', 'Manager', 'Designer', 'Analyst', 'Specialist',
    'Lead', 'Architect', 'Director', 'Consultant', 'Administrator', 'Scientist',
    'Coordinator', 'Executive', 'Associate', 'Assistant', 'Officer',
    'Representative', 'Agent',
];

const SKILLS_LIST = [
    // Languages
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'C++', 'Ruby', 'PHP',
    'Swift', 'Kotlin', 'Go', 'Rust', 'Scala', 'R',
    // Frontend
    'React', 'Angular', 'Vue', 'Next.js', 'Nuxt', 'Svelte', 'jQuery',
    'Bootstrap', 'Tailwind', 'HTML', 'CSS', 'SASS', 'Redux',
    // Backend
    'Node', 'Express', 'Django', 'Flask', 'FastAPI', 'Spring', 'ASP.NET',
    'Laravel', 'Rails', '.NET',
    // Databases
    'SQL', 'NoSQL', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Cassandra',
    'DynamoDB', 'Elasticsearch',
    // Cloud & DevOps
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Jenkins', 'GitLab',
    'GitHub', 'CI/CD', 'Terraform', 'Ansible',
    // Tools
    'Git', 'REST', 'GraphQL', 'Kafka', 'RabbitMQ', 'OAuth', 'JWT',
    'Agile', 'Scrum', 'Jira', 'Selenium', 'Jest', 'Linux', 'Bash',
];

export function parseJobText(rawText: string): ParsedJob {
    let text = rawText;
    for (const pattern of NAV_PATTERNS) {
        text = text.replace(pattern, '');
    }

    const result: ParsedJob = {
        title: '', company: '', location: '', skills: '',
        workMode: 'ONSITE', degrees: [], passoutYears: [],
    };

    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 5 && l.length < 120);

    // Title
    for (const line of lines) {
        if (/^\d+$|^Posted|^Location:|^Experience:|^Salary:|^Job ID/i.test(line)) continue;
        if (TITLE_KEYWORDS.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(line))) {
            if (line.split(' ').length >= 2 && line.split(' ').length <= 8) {
                result.title = line;
                break;
            }
        }
    }

    // Company
    const companyPatterns = [
        /(?:About|Join|At)\s+([A-Z][^\n,]{2,40})(?:\n|,|\s+is\s+|\s+makes\s+|\s+offers\s+)/i,
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\s+(?:is a|is an|makes|offers|provides|specializes)/i,
        /Working (?:at|with|for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/i,
    ];
    for (const pattern of companyPatterns) {
        const m = text.match(pattern);
        if (m?.[1]) { result.company = m[1].trim(); break; }
    }

    // Location (India-focused)
    const locationPatterns = [
        /Location:?\s*([A-Z][a-z]+(?:[\s,]+[A-Z][a-z]+)*)/i,
        /\b(Mumbai|Bangalore|Bengaluru|Delhi|NCR|Hyderabad|Pune|Chennai|Kolkata|Ahmedabad|Surat|Jaipur|Kochi|Indore|Chandigarh|Gurgaon|Gurugram|Noida)[,\s]*(India|Maharashtra|Karnataka|Tamil Nadu|Telangana|Gujarat|Rajasthan|Kerala|West Bengal|Haryana|UP)?/i,
    ];
    for (const pattern of locationPatterns) {
        const m = text.match(pattern);
        if (m) { result.location = m[0].replace(/Location:?\s*/i, '').trim(); break; }
    }

    // Skills
    const foundSkills = SKILLS_LIST.filter(skill => {
        const escaped = skill.replace(/[+#.]/g, '\\$&');
        return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
    });
    result.skills = foundSkills.join(', ');

    // Work mode
    if (/\b(fully remote|100% remote|remote.?only|work from home|wfh)\b/i.test(text)) {
        result.workMode = 'REMOTE';
    } else if (/\b(hybrid|flexible|remote.?friendly)\b/i.test(text)) {
        result.workMode = 'HYBRID';
    }

    // Degrees
    if (/\b(bachelor|B\.?E\.?|B\.?Tech|B\.?S\.?|graduation|undergraduate|UG)\b/i.test(text)) {
        result.degrees.push('DEGREE');
    }
    if (/\b(diploma|polytechnic)\b/i.test(text)) {
        if (!result.degrees.includes('DIPLOMA')) result.degrees.push('DIPLOMA');
    }
    if (/\b(master|M\.?E\.?|M\.?Tech|M\.?S\.?|M\.?C\.?A|M\.?B\.?A|post.?graduate|PG)\b/i.test(text)) {
        result.degrees.push('PG');
    }
    if (result.degrees.length === 0) result.degrees.push('DEGREE');

    // Passout years
    const currentYear = new Date().getFullYear();
    const yearMatches = text.match(/\b(20\d{2})\b/g);
    if (yearMatches) {
        const valid = yearMatches
            .map(y => parseInt(y))
            .filter(y => y >= 2020 && y <= currentYear + 2);
        if (valid.length > 0) result.passoutYears = [...new Set(valid)].sort();
    }

    result.description = text.trim().substring(0, 2000);
    return result;
}

