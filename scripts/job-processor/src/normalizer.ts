import { z } from 'zod';
import {
    CANONICAL_COMPANIES,
    CANONICAL_SKILLS_MAP,
    CANONICAL_CITIES_MAP,
    CANONICAL_EDUCATION
} from './metadata.js';
import {
    normalizeCourseArray,
    normalizeSpecializationArray,
    SKILL_ALIAS_LOOKUP
} from '@fresherflow/constants';

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
}).optional().nullable().default({ method: 'DIRECT' });

export const structuredLocationSchema = z.object({
    name: z.string(),
    state: z.string().optional(),
    country: z.string().optional(),
    type: z.enum(['city', 'state', 'country', 'remote'])
});

export const jobSchema = z.object({
    type: z.enum(['JOB', 'INTERNSHIP', 'WALKIN', 'REMOTE', 'GOVERNMENT', 'HACKATHONS']).catch('JOB'),
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED', 'EXPIRED']).optional().default('DRAFT'),
    title: z.string().min(1),
    company: z.string().min(1),
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
    workMode: z.enum(['ONSITE', 'HYBRID', 'REMOTE']).optional().nullable(),
    experienceMin: z.number().optional().nullable().default(0),
    experienceMax: z.number().optional().nullable().default(0),
    salaryRange: z.string().optional().default(''),
    salaryAmount: z.string().optional().default(''),
    salaryPeriod: z.enum(['MONTHLY', 'YEARLY']).catch('YEARLY'),
    employmentType: z.string().optional().default(''),
    jobFunction: z.string().optional().nullable(),
    incentives: z.union([z.string(), z.array(z.string())]).transform(v => Array.isArray(v) ? v.join('\n') : v).optional().nullable(),
    selectionProcess: z.union([z.string(), z.array(z.string())]).transform(v => Array.isArray(v) ? v.join('\n') : v).optional().nullable(),
    notesHighlights: z.union([z.string(), z.array(z.string())]).transform(v => Array.isArray(v) ? v.join('\n') : v).optional().nullable(),
    applyLink: z.string().optional().default(''),
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
    // --- 1. Company Casing and Lookup ---
    const rawCompany = (job.company || '').trim();
    if (rawCompany) {
        const canonicalCompany = CANONICAL_COMPANIES.get(rawCompany.toLowerCase());
        if (canonicalCompany) {
            job.company = canonicalCompany.name;
            if (canonicalCompany.url && (!job.companyWebsite || !job.companyWebsite.startsWith('http'))) {
                job.companyWebsite = canonicalCompany.url;
            }
        }
    }

    // --- 2. Location Normalization ---
    if (job.locations && Array.isArray(job.locations)) {
        job.locations = Array.from(new Set(job.locations.map(loc => {
            const cleaned = loc.trim().toLowerCase();
            if (cleaned === 'bengaluru') return 'Bangalore';
            if (cleaned === 'gurgaon') return 'Gurugram';
            
            const match = CANONICAL_CITIES_MAP.get(cleaned);
            if (match) return match;
            
            // Accept any new location if it doesn't match CDN
            return loc.trim();
        }).filter(Boolean)));
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
    degrees = degrees.map(deg => {
        const cleaned = deg.toUpperCase().trim();
        const match = validLevels.find(level => level.toUpperCase() === cleaned);
        if (match) return match;

        if (cleaned.includes('POSTGRADUATE') || cleaned.includes('POST GRADUATE') || cleaned.includes('PG') || cleaned.includes('MASTER')) return 'PG';
        if (cleaned.includes('BACHELOR') || cleaned.includes('DEGREE') || cleaned.includes('GRADUATE') || cleaned.includes('UNDERGRADUATE') || cleaned.includes('UG') || cleaned.includes('ENGINEERING')) return 'DEGREE';
        if (cleaned.includes('DIPLOMA') || cleaned.includes('POLYTECHNIC') || cleaned.includes('ITI')) return 'DIPLOMA';
        if (cleaned.includes('12') || cleaned.includes('INTERMEDIATE') || cleaned.includes('INTER') || cleaned.includes('HSC')) return 'INTER';
        if (cleaned.includes('10') || cleaned.includes('MATRICULATION') || cleaned.includes('SSC') || cleaned.includes('TENTH')) return 'TENTH';
        return '';
    }).filter(Boolean);

    job.allowedDegrees = Array.from(new Set(degrees));
    job.allowedCourses = Array.from(new Set(courses));
    job.allowedSpecializations = Array.from(new Set(specializations));

    // --- 4. Skills Normalization ---
    const finalSkillsSet = new Set<string>();

    // Process skills explicitly extracted by LLM
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
