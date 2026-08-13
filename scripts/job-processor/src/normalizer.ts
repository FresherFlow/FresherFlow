import { z } from 'zod';
import {
    OpportunityType,
    OpportunityStatus,
    WorkMode,
    SalaryPeriod
} from '@fresherflow/types';
import {
    cleanAndResolveLocations,
    parseHtmlToMarkdown,
    extractWorkMode,
    extractDegrees,
    extractPassoutYears,
    extractSkills,
    extractType,
} from '@fresherflow/parser';
import {
    CANONICAL_COMPANIES,
    CANONICAL_SKILLS_MAP,
    CANONICAL_CITIES_MAP,
    CANONICAL_EDUCATION,
    ORACLE_SLUG_MAP,
    GREENHOUSE_SLUG_MAP,
    WORKDAY_URL_MAP,
    SMARTRECRUITERS_SLUG_MAP
} from '@fresherflow/parser/metadata';

import {
    normalizeCourseArray,
    normalizeSpecializationArray,
    SKILL_ALIAS_LOOKUP
} from '@fresherflow/constants';

import { BRAND_DOMAINS } from '@fresherflow/utils';


export const walkInDetailsSchema = z.object({
    dateRange: z.string().optional().default(''),
    timeRange: z.string().optional().default(''),
    reportingTime: z.string().optional().default(''),
    dates: z.array(z.string()).default([]),
    venueAddress: z.string().optional().default(''),
    venueLink: z.string().optional().default(''),
    requiredDocuments: z.array(z.string()).default([]),
    contactPerson: z.string().optional().default(''),
    contactPhone: z.string().optional().default(''),
}).optional().nullable();

export const applicationDetailsSchema = z.object({
    method: z.enum(['DIRECT', 'FORM', 'ASSESSMENT']).optional().default('DIRECT'),
    platform: z.string().optional().default(''),
    estimatedMinutes: z.number().int().positive().optional(),
    requiredItems: z.array(z.string()).optional().default([])
}).optional().nullable().default({
    method: 'DIRECT',
    platform: '',
    requiredItems: []
});

export const structuredLocationSchema = z.object({
    name: z.string(),
    state: z.string().optional(),
    country: z.string().optional(),
    type: z.enum(['city', 'state', 'country', 'remote'])
});

export const jobSchema = z.object({
    type: z.nativeEnum(OpportunityType).catch(OpportunityType.JOB),
    status: z.nativeEnum(OpportunityStatus).optional().default(OpportunityStatus.DRAFT),
    title: z.string().min(1),
    company: z.string().min(1),
    companyId: z.string().optional().nullable(),
    companyWebsite: z.string().optional().default(''),
    companyLogoUrl: z.string().optional().default(''),
    description: z.string().optional().default(''),
    allowedDegrees: z.array(z.string()).default([]),
    allowedCourses: z.array(z.string()).default([]),
    allowedSpecializations: z.array(z.string()).default([]),
    allowedPassoutYears: z.array(z.number().int()).default([]),
    requiredSkills: z.array(z.string()).default([]),
    locations: z.array(z.string()).default([]),
    structuredLocations: z.array(structuredLocationSchema).optional().default([]),
    workMode: z.nativeEnum(WorkMode).optional().nullable(),
    experienceMin: z.number().optional().nullable().default(0),
    experienceMax: z.number().optional().nullable().default(0),
    salaryRange: z.string().optional().default(''),
    salaryAmount: z.string().optional().default(''),
    salaryPeriod: z.nativeEnum(SalaryPeriod).catch(SalaryPeriod.YEARLY),
    employmentType: z.string().optional().default(''),
    jobFunction: z.string().optional().nullable(),
    incentives: z.union([z.string(), z.array(z.string())]).transform(v => Array.isArray(v) ? v.join('\n') : v).optional().nullable(),
    selectionProcess: z.union([z.string(), z.array(z.string())]).transform(v => Array.isArray(v) ? v.join('\n') : v).optional().nullable(),
    notesHighlights: z.union([z.string(), z.array(z.string())]).transform(v => Array.isArray(v) ? v.join('\n') : v).optional().nullable(),
    applyLink: z.string().optional().default(''),
    sourceLink: z.string().optional().default(''),
    customSlug: z.string().optional().default(''),
    expiresAt: z.string().optional().default(''),
    applicationDetails: applicationDetailsSchema,
    
    // Walk-in fields
    venueAddress: z.string().optional().default(''),
    venueLink: z.string().optional().default(''),
    dateRange: z.string().optional().default(''),
    timeRange: z.string().optional().default(''),
    requiredDocuments: z.array(z.string()).default([]),
    contactPerson: z.string().optional().default(''),
    contactPhone: z.string().optional().default(''),
    startDate: z.string().optional().default(''),
    endDate: z.string().optional().default(''),
    startTime: z.string().optional().default('10:00'),
    endTime: z.string().optional().default('13:00'),
    walkInDetails: walkInDetailsSchema
});

export type ExtractedJob = z.infer<typeof jobSchema>;

export interface DiscoveredJob {
    title: string;
    applyLink: string;
    source: string;
    sourceType: 'ATS' | 'AGGREGATOR';
    discoveredAt: string;
    company?: string;
    companyId?: string;
    company_id?: string;
    location?: string;
    reviewRequired?: boolean;
    aggregatorUrl?: string;
    aggregatorTitle?: string;
    atsText?: string;
    isAggregatorReview?: boolean;
}

export interface JobsJsonFormat {
    version: number;
    source: string;
    jobs: DiscoveredJob[];
}

export function normalizeRawJson(raw: Record<string, unknown>): Record<string, unknown> {
    if (!raw || typeof raw !== 'object') return raw;

    // 1. Normalize type
    if (typeof raw.type === 'string') {
        const t = raw.type.toUpperCase();
        if (['JOB', 'INTERNSHIP', 'WALKIN'].includes(t)) {
            raw.type = t;
        } else {
            raw.type = 'JOB';
        }
    }

    // 2. Normalize allowedDegrees
    if (Array.isArray(raw.allowedDegrees)) {
        raw.allowedDegrees = Array.from(new Set(raw.allowedDegrees.map((deg: unknown) => {
            if (typeof deg !== 'string') return '';
            const lower = deg.toLowerCase().trim();
            if (lower.includes('postgraduate') || lower.includes('post graduate') || lower.includes('pg') || lower.includes('master')) return 'PG';
            if (lower.includes('bachelor') || lower.includes('degree') || lower.includes('graduate') || lower.includes('undergraduate') || lower.includes('ug') || lower.includes('engineering')) return 'DEGREE';
            if (lower.includes('diploma') || lower.includes('polytechnic') || lower.includes('iti')) return 'DIPLOMA';
            if (lower.includes('12') || lower.includes('intermediate') || lower.includes('inter') || lower.includes('hsc')) return 'INTER';
            if (lower.includes('10') || lower.includes('matriculation') || lower.includes('ssc') || lower.includes('tenth')) return 'TENTH';
            return '';
        }).filter(Boolean)));
    }

    // 3. Normalize workMode
    if (typeof raw.workMode === 'string') {
        const mode = raw.workMode.toUpperCase().trim();
        if (mode.includes('HYBRID')) raw.workMode = 'HYBRID';
        else if (mode.includes('REMOTE') || mode.includes('HOME')) raw.workMode = 'REMOTE';
        else if (mode.includes('ONSITE') || mode.includes('OFFICE')) raw.workMode = 'ONSITE';
        else raw.workMode = null;
    } else {
        raw.workMode = null;
    }

    // 4. Normalize salaryPeriod
    if (typeof raw.salaryPeriod === 'string') {
        const sp = raw.salaryPeriod.toUpperCase().trim();
        if (sp.includes('YEAR') || sp.includes('ANNU') || sp.includes('LPA') || sp.includes('CTC')) raw.salaryPeriod = 'YEARLY';
        else if (sp.includes('MONTH') || sp.includes('STIP')) raw.salaryPeriod = 'MONTHLY';
        else raw.salaryPeriod = 'YEARLY'; // default catch
    }

    // 5. Ensure numeric values for experience
    if (raw.experienceMin !== undefined && raw.experienceMin !== null) {
        const val = parseInt(String(raw.experienceMin), 10);
        raw.experienceMin = isNaN(val) ? 0 : val;
    }
    if (raw.experienceMax !== undefined && raw.experienceMax !== null) {
        const val = parseInt(String(raw.experienceMax), 10);
        raw.experienceMax = isNaN(val) ? null : val;
    }

    // 6. Ensure customSlug is empty string
    raw.customSlug = "";

    return raw;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function postProcessNormalize(job: ExtractedJob, _fullText: string): ExtractedJob {
    // Clean titles
    if (job.title) {
        // Strip numeric prefix (starts with at least 4 digits, optional dash/space-dash)
        job.title = job.title.replace(/^\d{4,}\b\s*[-–]?\s*/u, '').trim();

        // Strip general generic branding suffixes
        job.title = job.title.replace(/\s*[-–|]\s*[A-Z][^-|]{2,50}(?:Careers|Jobs|Hiring|Recruitment|Talent)\s*$/i, '').trim();
        
        // Strip the specific company name from the end if it's there
        if (job.company) {
            // Escape regex special chars in company name
            const escapedCompany = job.company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const companyRegex = new RegExp(`\\s*[-–|,|]\\s*${escapedCompany}\\s*$`, 'i');
            job.title = job.title.replace(companyRegex, '').trim();
        }
        
        // Final fallback: strip trailing | if it exists
        job.title = job.title.replace(/\s*\|\s*$/, '').trim();
    }

    // --- 0. Pre-processing fixes ---

    // Fix description: Convert to clean markdown
    if (job.description) {
        job.description = parseHtmlToMarkdown(job.description);
    }

    // Fix employmentType normalization
    if (job.employmentType) {
        const empClean = job.employmentType.toLowerCase().trim();
        if (empClean.includes('intern') || empClean.includes('trainee')) {
            job.employmentType = 'INTERNSHIP';
        } else if (empClean.includes('part time') || empClean.includes('part-time')) {
            job.employmentType = 'PART_TIME';
        } else if (empClean.includes('contract')) {
            job.employmentType = 'CONTRACT';
        } else if (empClean.includes('full time') || empClean.includes('full-time') || empClean === 'full_time' || empClean === 'regular') {
            job.employmentType = 'FULL_TIME';
        } else {
            job.employmentType = '';
        }
    }

    // Clean employment type: if empty, use extractType or job title to infer it, falling back to FULL_TIME
    if (!job.employmentType || job.employmentType === '') {
        if (job.type === 'INTERNSHIP') {
            job.employmentType = 'INTERNSHIP';
        } else {
            const titleLower = (job.title || '').toLowerCase();
            const inferredType = extractType(titleLower);
            if (inferredType === 'INTERNSHIP') {
                job.employmentType = 'INTERNSHIP';
            } else if (titleLower.includes('part time') || titleLower.includes('part-time')) {
                job.employmentType = 'PART_TIME';
            } else if (titleLower.includes('contract')) {
                job.employmentType = 'CONTRACT';
            } else {
                job.employmentType = 'FULL_TIME';
            }
        }
    }

    // Oracle company name resolution (only if missing or mistakenly scraped as 'Oracle' due to ATS domain)
    if (job.applyLink && (!job.company || job.company.toLowerCase().trim() === 'oracle')) {
        try {
            const url = new URL(job.applyLink);
            const host = url.hostname.toLowerCase();
            if (host === 'oraclecloud.com' || host.endsWith('.oraclecloud.com')) {
                const parts = host.split('.');
                const subdomain = parts[0];

            let resolvedName = '';

            // 1. Try mapping the full candidate experience site prefix from CDN (ats/oracle.json)
            const lowerLink = job.applyLink.toLowerCase();
            for (const [prefix, compName] of ORACLE_SLUG_MAP.entries()) {
                if (lowerLink.startsWith(prefix)) {
                    resolvedName = compName;
                    break;
                }
            }

            // 2. If not prefix matched, fallback to subdomain title-case
            if (!resolvedName) {
                resolvedName = subdomain
                    .replace(/-/g, ' ')
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, c => c.toUpperCase());
            }

            // 3. Try matching by website domain using BRAND_DOMAINS
            let canonicalCompany = null;
            const lowerSubdomain = subdomain.toLowerCase().trim();
            const matchedDomain = BRAND_DOMAINS[lowerSubdomain] || BRAND_DOMAINS[resolvedName.toLowerCase().trim()];

            if (matchedDomain) {
                for (const company of CANONICAL_COMPANIES.values()) {
                    if (company.url) {
                        try {
                            const compHost = new URL(company.url).hostname.toLowerCase().replace(/^www\./, '');
                            if (compHost === matchedDomain) {
                                canonicalCompany = company;
                                break;
                            }
                        } catch {
                            // Ignore URL parsing errors
                        }
                    }
                }
            }

            const cleanResolved = resolvedName.toLowerCase().replace(/[^a-z0-9]/g, '');

            // Try exact name or slug match if not matched by domain
            if (!canonicalCompany) {
                for (const company of CANONICAL_COMPANIES.values()) {
                    if (
                        company.name.toLowerCase() === resolvedName.toLowerCase() ||
                        (company.slug && company.slug.toLowerCase() === cleanResolved)
                    ) {
                        canonicalCompany = company;
                        break;
                    }
                }
            }

            // Generic acronym match (e.g. "Jpmc" -> "JPMorgan Chase & Co.")
            if (!canonicalCompany && cleanResolved.length >= 3) {
                for (const company of CANONICAL_COMPANIES.values()) {
                    const fullName = company.name;
                    const matches = fullName.match(/[A-Z]|\b\w/g) || [];
                    const acronym = matches.join('').toLowerCase();
                    if (acronym.includes(cleanResolved)) {
                        canonicalCompany = company;
                        break;
                    }
                }
            }

            if (canonicalCompany) {
                job.company = canonicalCompany.name;
            } else if (matchedDomain) {
                const domainPrefix = matchedDomain.split('.')[0];
                job.company = domainPrefix.charAt(0).toUpperCase() + domainPrefix.slice(1);
            } else {
                job.company = resolvedName;
            }
            }
        } catch {
            // Ignore URL parsing errors
        }
    }

    // --- 1. Company Casing and Lookup ---
    let rawCompany = (job.company || '').trim();

    // Strip Workday/Oracle internal entity codes:
    // Pure alphanumeric: "LE400 Automation Anywhere..." → "Automation Anywhere..."
    // Mixed start:  "1G5 Pfizer Healthcare..." → "Pfizer Healthcare..."
    // Note: We require at least one digit in the prefix to avoid stripping valid acronyms like "GE Appliances" or "CDK Global"
    rawCompany = rawCompany
        .replace(/^(?=[A-Z0-9]*\d)[A-Z0-9]{2,6}\s+(?=[A-Z])/u, '')
        .replace(/^\d[A-Z]\d\s+(?=[A-Z])/u, '')
        .trim();
    // Strip trailing junk suffixes added by some ATS:
    // "Synechron Technologies Pvt. Ltd._INDIA Company" → strip "_INDIA Company" etc.
    rawCompany = rawCompany.replace(/_[A-Z][A-Za-z0-9 ]{2,50}$/, '').trim();

    // 1A. ATS maps resolution FIRST (exact URL/slug mappings from docs/data/ats/*.json)
    let atsResolvedName = '';
    if (job.applyLink) {
        try {
            const urlObj = new URL(job.applyLink);
            const lowerLink = job.applyLink.toLowerCase();
            const host = urlObj.hostname.toLowerCase();

            // Workday ATS
            if (host.endsWith('.myworkdayjobs.com') || host.endsWith('.myworkdaysite.com') || lowerLink.includes('workday')) {
                for (const [prefix, compName] of WORKDAY_URL_MAP.entries()) {
                    if (prefix.startsWith('http') && lowerLink.startsWith(prefix)) {
                        atsResolvedName = compName;
                        break;
                    }
                }
                if (!atsResolvedName) {
                    const subdomain = host.split('.')[0];
                    if (subdomain && WORKDAY_URL_MAP.has(subdomain)) {
                        atsResolvedName = WORKDAY_URL_MAP.get(subdomain)!;
                    }
                }
            }

            // SmartRecruiters ATS
            if (!atsResolvedName && (host === 'jobs.smartrecruiters.com' || host === 'api.smartrecruiters.com' || lowerLink.includes('smartrecruiters'))) {
                const parts = urlObj.pathname.split('/').filter(Boolean);
                const compIdx = parts.indexOf('companies');
                const urlSlug = compIdx !== -1 && parts[compIdx + 1] ? parts[compIdx + 1] : (parts[0] || '');
                if (urlSlug && SMARTRECRUITERS_SLUG_MAP.has(urlSlug.toLowerCase())) {
                    atsResolvedName = SMARTRECRUITERS_SLUG_MAP.get(urlSlug.toLowerCase())!;
                }
            }

            // Greenhouse ATS
            if (!atsResolvedName && (host.includes('greenhouse.io') || lowerLink.includes('greenhouse'))) {
                const parts = urlObj.pathname.split('/').filter(Boolean);
                const slug = parts[0] || '';
                if (slug && GREENHOUSE_SLUG_MAP.has(slug.toLowerCase())) {
                    atsResolvedName = GREENHOUSE_SLUG_MAP.get(slug.toLowerCase())!;
                }
            }

            // Oracle ATS
            if (!atsResolvedName && (host.endsWith('.oraclecloud.com') || lowerLink.includes('oraclecloud'))) {
                for (const [prefix, compName] of ORACLE_SLUG_MAP.entries()) {
                    if (lowerLink.startsWith(prefix)) {
                        atsResolvedName = compName;
                        break;
                    }
                }
            }
        } catch { /* ignore */ }
    }

    // Check ATS maps by rawCompany if applyLink didn't match
    if (!atsResolvedName && rawCompany) {
        const lowerRaw = rawCompany.toLowerCase();
        if (WORKDAY_URL_MAP.has(lowerRaw)) {
            atsResolvedName = WORKDAY_URL_MAP.get(lowerRaw)!;
        } else if (SMARTRECRUITERS_SLUG_MAP.has(lowerRaw)) {
            atsResolvedName = SMARTRECRUITERS_SLUG_MAP.get(lowerRaw)!;
        } else if (GREENHOUSE_SLUG_MAP.has(lowerRaw)) {
            atsResolvedName = GREENHOUSE_SLUG_MAP.get(lowerRaw)!;
        }
    }

    if (atsResolvedName) {
        rawCompany = atsResolvedName;
        job.company = atsResolvedName;
    }


    if (atsResolvedName) {
        rawCompany = atsResolvedName;
        job.company = atsResolvedName;
    }

    // Strip verbose legal suffixes to get brand name for CDN lookup:
    // "Genpact India Pvt. Ltd." → "Genpact"
    // "Pfizer Healthcare India Private Limited" → "Pfizer"
    const legalSuffixMatch = rawCompany.match(/^([A-Za-z][A-Za-z0-9\s&.'-()]{0,40?}?)\s+(?:India|Solutions|Technologies|Services|Holdings|Group|International|Global|Limited|Private|Pvt\.?|Ltd\.?|Inc\.?|Corp\.?|LLC\.?|Company|P\.L\.)/i);
    const brandName = legalSuffixMatch ? legalSuffixMatch[1].trim() : rawCompany;

    if (rawCompany) {
        let canonicalCompany = CANONICAL_COMPANIES.get(rawCompany.toLowerCase())
            ?? CANONICAL_COMPANIES.get(brandName.toLowerCase());
        
        // If no direct match, try matching by slug
        if (!canonicalCompany) {
            const rawLower = rawCompany.toLowerCase();
            for (const company of CANONICAL_COMPANIES.values()) {
                if (company.slug && company.slug.toLowerCase() === rawLower) {
                    canonicalCompany = company;
                    break;
                }
            }
        }

        // Try stripping trailing digits (e.g. 'nagarro1' -> 'nagarro')
        if (!canonicalCompany) {
            const withoutDigits = rawCompany.toLowerCase().replace(/\d+$/, '');
            if (withoutDigits && withoutDigits !== rawCompany.toLowerCase()) {
                canonicalCompany = CANONICAL_COMPANIES.get(withoutDigits);
                if (!canonicalCompany) {
                    for (const company of CANONICAL_COMPANIES.values()) {
                        if (company.slug && company.slug.toLowerCase() === withoutDigits) {
                            canonicalCompany = company;
                            break;
                        }
                    }
                }
            }
        }

        // Try extracting company from apply link URL (Workday subdomain, SmartRecruiters path slug)
        if (!canonicalCompany && job.applyLink) {
            try {
                const urlObj = new URL(job.applyLink);
                const host = urlObj.hostname.toLowerCase();
                let urlSlug = '';
                // Workday: subdomain.wd1.myworkdayjobs.com
                if (host.endsWith('.myworkdayjobs.com') || host.endsWith('.myworkdaysite.com')) {
                    urlSlug = host.split('.')[0];
                }
                // SmartRecruiters: jobs.smartrecruiters.com/CompanySlug/... or api.smartrecruiters.com/v1/companies/CompanySlug/...
                else if (host === 'jobs.smartrecruiters.com' || host === 'api.smartrecruiters.com') {
                    const parts = urlObj.pathname.split('/').filter(Boolean);
                    // api.smartrecruiters.com/v1/companies/CompanySlug/postings/ID
                    const compIdx = parts.indexOf('companies');
                    urlSlug = compIdx !== -1 && parts[compIdx + 1] ? parts[compIdx + 1] : (parts[0] || '');
                }
                if (urlSlug) {
                    canonicalCompany = CANONICAL_COMPANIES.get(urlSlug.toLowerCase());
                    if (!canonicalCompany) {
                        for (const company of CANONICAL_COMPANIES.values()) {
                            if (company.slug && company.slug.toLowerCase() === urlSlug.toLowerCase()) {
                                canonicalCompany = company;
                                break;
                            }
                        }
                    }
                }
            } catch { /* ignore */ }
        }

        if (canonicalCompany) {
            job.company = canonicalCompany.name;
            if (canonicalCompany.url && (!job.companyWebsite || !job.companyWebsite.startsWith('http'))) {
                job.companyWebsite = canonicalCompany.url;
            }
        } else {
            // Cleanup: dashes/underscores to spaces, split camelCase, title-case
            job.company = rawCompany
                .replace(/([a-z])([A-Z])/g, '$1 $2')  // camelCase split
                .replace(/[-_]/g, ' ')                  // dashes/underscores to spaces
                .replace(/\b\w/g, c => c.toUpperCase()) // title-case
                .replace(/\s{2,}/g, ' ')
                .trim();
        }
    }

    // --- 2. Location Normalization ---
    if (job.locations && Array.isArray(job.locations)) {
        const rawStrings: string[] = [];
        for (const rawLoc of job.locations) {
            let s: string;
            if (typeof rawLoc === 'object' && rawLoc !== null) {
                s = (rawLoc as any).city || (rawLoc as any).name || (rawLoc as any).region || '';
            } else if (typeof rawLoc === 'string') {
                s = rawLoc;
            } else {
                continue;
            }

            // Sometimes it's a JSON stringified object
            if (s.startsWith('{') && s.endsWith('}')) {
                try {
                    const parsed = JSON.parse(s);
                    s = parsed.city || parsed.name || parsed.region || '';
                } catch {
                    s = '';
                }
            }

            for (const part of s.split(';')) {
                const cleaned = stripAtsOfficeCode(part.trim());
                if (cleaned) rawStrings.push(cleaned);
            }
        }

        const { locations: resolvedLocs, structuredLocations: resolvedStructLocs } = cleanAndResolveLocations(rawStrings);
        job.locations = resolvedLocs;
        job.structuredLocations = resolvedStructLocs;
    }

    // Clean work mode: if null, call parser's extractWorkMode, falling back to ONSITE
    if (!job.workMode) {
        const hasRemoteLocation = job.locations?.some(loc => loc.toLowerCase() === 'remote');
        if (hasRemoteLocation) {
            job.workMode = 'REMOTE' as any;
        } else {
            job.workMode = (extractWorkMode(_fullText || '') || 'ONSITE') as any;
        }
    }


    // --- 3. Education (Degrees, Courses & Specializations) Normalization ---
    let degrees = job.allowedDegrees || [];
    let courses = normalizeCourseArray(job.allowedCourses || []);
    let specializations = normalizeSpecializationArray(job.allowedSpecializations || []);

    // 3a. Normalize specializations & infer courses
    if (CANONICAL_EDUCATION && CANONICAL_EDUCATION.specializations) {
        const flatCdnSpecializations = Object.values(CANONICAL_EDUCATION.specializations).flat();
        specializations = specializations.map(spec => {
            const cleaned = spec.toLowerCase().trim();
            const cdnMatch = flatCdnSpecializations.find(s => s.toLowerCase().trim() === cleaned);
            if (cdnMatch) {
                // Infer the course name from this specialization
                for (const [courseName, specsList] of Object.entries(CANONICAL_EDUCATION.specializations)) {
                    if (specsList.some(s => s.toLowerCase().trim() === cleaned)) {
                        courses.push(courseName);
                    }
                }
                return cdnMatch;
            }
            return spec;
        });
    }

    // 3b. Normalize courses & infer degrees
    if (CANONICAL_EDUCATION && CANONICAL_EDUCATION.courses) {
        const flatCdnCourses = Object.values(CANONICAL_EDUCATION.courses).flat();
        courses = Array.from(new Set(courses)); // Deduplicate inferred courses
        courses = courses.map(course => {
            const cleaned = course.toLowerCase().trim();
            const cdnMatch = flatCdnCourses.find(c => c.toLowerCase().trim() === cleaned);
            if (cdnMatch) {
                // Infer the degree level from this course
                for (const [level, coursesList] of Object.entries(CANONICAL_EDUCATION.courses)) {
                    if (coursesList.some(c => c.toLowerCase().trim() === cleaned)) {
                        degrees.push(level);
                    }
                }
                return cdnMatch;
            }
            return course;
        });
    }

    // 3c. Normalize degrees
    const cdnLevels = CANONICAL_EDUCATION.educationLevels || [];
    const validLevels = ['TENTH', 'INTER', ...cdnLevels];
    degrees = Array.from(new Set(degrees)); // Deduplicate inferred degrees
    if (degrees.length === 0) {
        degrees = extractDegrees(_fullText || '');
    } else {
        degrees = degrees.flatMap(deg => {
            const cleaned = deg.toUpperCase().trim();
            const match = validLevels.find(level => level.toUpperCase() === cleaned);
            if (match) return [match];

            return extractDegrees(deg);
        });
    }

    job.allowedDegrees = Array.from(new Set(degrees)).filter(Boolean);
    job.allowedCourses = Array.from(new Set(courses));
    job.allowedSpecializations = Array.from(new Set(specializations));

    // Allowed passout years: if empty, extract from full text first, otherwise infer from current year and job type
    if (!job.allowedPassoutYears || job.allowedPassoutYears.length === 0) {
        const extractedYears = extractPassoutYears(_fullText || '');
        if (extractedYears.length > 0) {
            job.allowedPassoutYears = extractedYears;
        } else {
            const currentYear = new Date().getFullYear();
            if (job.type === 'INTERNSHIP') {
                job.allowedPassoutYears = [currentYear, currentYear + 1, currentYear + 2];
            } else {
                job.allowedPassoutYears = [currentYear - 1, currentYear];
            }
        }
    } else {
        job.allowedPassoutYears = Array.from(new Set(job.allowedPassoutYears.map(y => parseInt(String(y), 10)).filter(y => !isNaN(y))));
    }

    // --- 4. Skills Normalization ---
    if (!job.requiredSkills || job.requiredSkills.length === 0) {
        job.requiredSkills = extractSkills(_fullText || '', job.locations);
    }

    const finalSkillsSet = new Set<string>();

    // Process skills explicitly extracted by LLM or parser
    if (job.requiredSkills && Array.isArray(job.requiredSkills)) {
        for (const skill of job.requiredSkills) {
            if (!skill) continue;
            const cleaned = skill.trim().toLowerCase();
            
            const aliasMatch = SKILL_ALIAS_LOOKUP[cleaned];
            if (aliasMatch) {
                const cdnSkillMatch = CANONICAL_SKILLS_MAP.get(aliasMatch.toLowerCase());
                finalSkillsSet.add(cdnSkillMatch || aliasMatch);
                continue;
            }

            const directMatch = CANONICAL_SKILLS_MAP.get(cleaned);
            if (directMatch) {
                finalSkillsSet.add(directMatch);
                continue;
            }

            finalSkillsSet.add(skill.trim().toLowerCase());
        }
    }

    // Keep it clean: max 25 skills to avoid spamming tags on jobs
    job.requiredSkills = Array.from(finalSkillsSet).slice(0, 25);

    // --- 5. Strip walk-in fields from non-WALKIN types ---
    if (job.type !== 'WALKIN') {
        const walkinFields = ['venueAddress', 'venueLink', 'dateRange', 'timeRange',
            'requiredDocuments', 'contactPerson', 'contactPhone',
            'startDate', 'endDate', 'startTime', 'endTime'] as const;
        for (const field of walkinFields) {
            delete (job as Record<string, unknown>)[field];
        }
        job.walkInDetails = null;
    }

    return job;
}

/**
 * Strip ATS-internal office code prefixes.
 * These are company-internal identifiers, NOT location names.
 * Pattern: codes always appear BEFORE a comma or colon, and are
 * either all-caps alphanumeric or contain digits.
 */
function stripAtsOfficeCode(raw: string): string {
    let s = raw
        .replace(/^(ph|us|uk|sg|ind|in)$/i, '')
        .replace(/^\d[\w-]*:\s*/i, '')
        .replace(/^[A-Z]{2,4}-[A-Za-z]+-[A-Z]\s*,\s*/i, '')
        .replace(/^[A-Z]{2,3}-\s*/i, '')
        .replace(/\([A-Z0-9]{4,}\)/g, '')
        .replace(/\b(WeWork|RMZ|Manyatha|EPIP|STPI|SEZ|Technopark|Pritech|Prestige|Godrej|DLF Cyber City|Experio|Carnival|Express Zone|Hafeezpet Phoenix|Novus Tower|Uppal L&R|Vibhuti Khand|Sitapura)\b[^,]*/gi, '')
        .replace(/,\s*(WB|KA|TG|TN|UP|GJ|MH|HR|NCR|IND|DL|KL|TS|PB|RJ|MP)\b/gi, '')
        .replace(/,\s*(India|IN|IND|in|es|us|uk|de|sg|au|ca)\s*$/i, '')
        // Strip leading "IN - " prefix (SmartRecruiters style: "IN - Chennai, India")
        .replace(/^IN\s*[-\u2013]\s*/i, '')
        // Strip leading "India, " prefix (Workday style: "India, Mumbai, 400079, India")
        .replace(/^India,\s*/i, '')
        .replace(/^[A-Z]{3,6}\s+(?=[A-Z][a-z])/, '')
        .replace(/\b\d{5,6}\b/g, '')
        .replace(/\b(Floor|Flr|FL|Plot|Phase|Block|Tower|Gate|Near|Opp|Beside)\b[^,]*/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();

    const parts = s.split(',').map(p => p.trim()).filter(p => p.length > 1);
    if (parts.length > 1) {
        return parts[parts.length - 1];
    }
    return s;
}
