import { City } from '@fresherflow/constants';
import { EnrichedJobPayload } from './enricher-schema.js';
import { EducationLevel, SalaryPeriod } from '@fresherflow/types';

// Pre-compute map of lowercase city names to properly capitalized City names in India
const INDIAN_CITY_MAP = new Map<string, string>();
for (const city of (City.getCitiesOfCountry('IN') || [])) {
    INDIAN_CITY_MAP.set(city.name.toLowerCase(), city.name);
}

// Common Indian & Global State/Country suffixes to strip for City-Only Rule
const STRIP_SUFFIXES = [
    /\b(India|United States|USA|UK|United Kingdom|Singapore|Germany|Canada|Australia)\b/gi,
    /\b(Karnataka|Telangana|Tamil Nadu|Maharashtra|Haryana|Uttar Pradesh|Delhi NCR|Delhi|Gujarat|West Bengal|Kerala|Andhra Pradesh|Punjab|Rajasthan|Madhya Pradesh)\b/gi,
    /\b(KA|TN|TS|MH|HR|UP|DL|GJ|WB|KL|AP|PB|RJ|MP)\b/g
];

/**
 * Enforces City-Only Principle on locations array (docs/data/templates.md).
 * Uses country-state-city package for accurate city name capitalization.
 */
export function sanitizeLocation(rawLoc: string): string {
    if (!rawLoc) return '';
    let cleaned = rawLoc.trim();

    if (/^remote$/i.test(cleaned)) return 'Remote';
    
    // Split by comma and pick the city (first component)
    const parts = cleaned.split(',').map(p => p.trim()).filter(Boolean);
    if (parts.length > 0) {
        let cityCandidate = parts[0];
        // Strip trailing state/country if attached
        for (const re of STRIP_SUFFIXES) {
            cityCandidate = cityCandidate.replace(re, '').trim();
        }
        if (cityCandidate.length > 1) {
            const normalizedCandidate = cityCandidate.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
            const lowerCandidate = normalizedCandidate.toLowerCase();
            if (INDIAN_CITY_MAP.has(lowerCandidate)) {
                return INDIAN_CITY_MAP.get(lowerCandidate)!;
            }
            // Capitalize first letter of each word if not in exact map
            return normalizedCandidate.replace(/\b\w/g, l => l.toUpperCase());
        }
    }

    return cleaned;
}

export function sanitizeLocations(locations: string[]): string[] {
    if (!locations || locations.length === 0) return [];
    const set = new Set<string>();
    for (const loc of locations) {
        const cleaned = sanitizeLocation(loc);
        if (cleaned) set.add(cleaned);
    }
    return Array.from(set);
}

/**
 * Converts raw HTML tags and text into clean, formatted Markdown.
 */
export function formatDescription(desc: string): string {
    if (!desc) return '';
    
    let text = desc
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<li[^>]*>/gi, '\n- ')
        .replace(/<\/li>/gi, '')
        .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
        .replace(/<(?:[^>"']|"[^"]*"|'[^']*')*>/g, '') // Strip remaining HTML tags
        .replace(/&(nbsp|amp|lt|gt);/gi, m => {
            const map: Record<string, string> = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>' };
            return map[m.toLowerCase()] || m;
        })
        .replace(/\r\n?/g, '\n');

    // Standardize headings
    const headingPatterns = [
        /^(About the Role|Responsibilities|Requirements|Eligibility|Qualifications|Preferred Qualifications|What You'll Do|What We're Looking For|Benefits|Selection Process):?/gim,
    ];

    for (const pattern of headingPatterns) {
        text = text.replace(pattern, '\n**$1**\n');
    }

    return text.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Enforces quality rule: notesHighlights should not exceed 25% of description size.
 */
export function validateNotesHighlights(payload: EnrichedJobPayload): void {
    if (!payload.notesHighlights || payload.notesHighlights.trim().length === 0) return;
    
    const descLen = payload.description ? payload.description.length : 0;
    const maxNotesLen = Math.max(150, Math.floor(descLen * 0.25));

    if (payload.notesHighlights.length > maxNotesLen) {
        payload.description = `${payload.description}\n\n**Additional Notes**\n${payload.notesHighlights}`;
        payload.notesHighlights = '';
    }
}

/**
 * Generates a clean, intelligent URL slug: company-title-city
 * Example: EXL + Associate - FAO + Kochi -> "exl-associate-fao-kochi"
 */
export function generateIntelligentSlug(company: string, title: string, locations: string[]): string {
    const slugifyText = (text: string) => text.toLowerCase().trim().split(/[^a-z0-9_]+/).filter(Boolean).join('-');
    const compPart = slugifyText(company);
    const titlePart = slugifyText(title);
    const cityPart = locations.length > 0 ? slugifyText(locations[0]) : '';
    
    return [compPart, titlePart, cityPart].filter(Boolean).join('-');
}

/**
 * Master payload validation and sanitizer according to docs/data/templates.md.
 * Ensures EVERY field specified in templates.md is present in the final object.
 */
export function validateAndCleanPayload(payload: EnrichedJobPayload): EnrichedJobPayload {
    const sanitizedLocations = sanitizeLocations(payload.locations || []);
    const cleanTitle = payload.title?.trim() || 'Software Engineer';
    const cleanCompany = payload.company?.trim() || 'Company';

    let customSlug = payload.customSlug?.trim() || '';
    if (!customSlug) {
        customSlug = generateIntelligentSlug(cleanCompany, cleanTitle, sanitizedLocations);
    }

    // Role-aware academic defaults
    const lowerFn = (payload.jobFunction || cleanTitle).toLowerCase();
    let defaultCourses = ['B.Tech', 'B.E.', 'BCA', 'MCA', 'B.Sc'];
    let defaultSpecs = ['Computer Science', 'Information Technology'];

    if (/\b(hr|human resources|talent|recruitment|recruiter|people)\b/i.test(lowerFn)) {
        defaultCourses = ['BBA', 'MBA', 'B.Com', 'B.A', 'B.Sc', 'Any Graduate'];
        defaultSpecs = ['Human Resources', 'General', 'Business Administration'];
    } else if (/\b(finance|accounting|accounts|payroll|tax|audit|controller)\b/i.test(lowerFn)) {
        defaultCourses = ['B.Com', 'M.Com', 'BBA', 'MBA', 'Any Graduate'];
        defaultSpecs = ['Finance', 'Accounting', 'Commerce'];
    } else if (/\b(marketing|sales|growth|business development|bdr|sdr|affiliate)\b/i.test(lowerFn)) {
        defaultCourses = ['BBA', 'MBA', 'B.Com', 'B.A', 'B.Sc', 'Any Graduate'];
        defaultSpecs = ['Marketing', 'Digital Marketing', 'General', 'Business Administration'];
    } else if (/\b(operations|support|customer|cst|helpdesk|admin)\b/i.test(lowerFn)) {
        defaultCourses = ['BBA', 'MBA', 'B.Com', 'B.A', 'B.Sc', 'B.Tech', 'Any Graduate'];
        defaultSpecs = ['General', 'Business Administration', 'Operations'];
    } else if (/\b(design|ux|ui|creative|graphic|product design)\b/i.test(lowerFn)) {
        defaultCourses = ['B.Des', 'M.Des', 'B.Tech', 'B.Sc', 'BCA', 'Any Graduate'];
        defaultSpecs = ['UI/UX Design', 'Product Design', 'Computer Science'];
    }

    const cleanedPayload: EnrichedJobPayload = {
        type: payload.type || 'JOB',
        title: cleanTitle,
        company: cleanCompany,
        companyWebsite: payload.companyWebsite || '',
        description: formatDescription(payload.description || ''),
        allowedDegrees: payload.allowedDegrees?.length ? payload.allowedDegrees : [EducationLevel.DEGREE],
        allowedCourses: payload.allowedCourses?.length ? payload.allowedCourses : defaultCourses,
        allowedSpecializations: payload.allowedSpecializations?.length ? payload.allowedSpecializations : defaultSpecs,
        allowedPassoutYears: payload.allowedPassoutYears || [],
        requiredSkills: payload.requiredSkills || [],
        locations: sanitizedLocations,
        workMode: payload.workMode || 'ONSITE',
        experienceMin: payload.experienceMin ?? 0,
        experienceMax: payload.experienceMax ?? 0,
        salaryRange: payload.salaryRange || '',
        salaryAmount: payload.salaryAmount || '',
        salaryPeriod: payload.salaryPeriod || SalaryPeriod.YEARLY,
        employmentType: payload.employmentType || '',
        jobFunction: payload.jobFunction || '',
        incentives: payload.incentives || '',
        selectionProcess: payload.selectionProcess || '',
        notesHighlights: payload.notesHighlights || '',
        applyLink: payload.applyLink || '',
        customSlug: customSlug,
        expiresAt: payload.expiresAt || '',
        applicationDetails: payload.applicationDetails ?? null
    };

    validateNotesHighlights(cleanedPayload);
    return cleanedPayload;
}
