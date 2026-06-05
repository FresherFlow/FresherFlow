import { buildShareUrl, type SharePlatform } from '@/lib/share';
export type { SharePlatform };
import { SITE_URL } from '@/lib/runtimeConfig';

import { getOpportunityPath } from '@/lib/opportunityPath';
import {
    normalizeCourseName,
    normalizeSpecializationName,
} from '@/lib/profileConstants';

export type OpportunityKind = 'JOB' | 'INTERNSHIP' | 'WALKIN';

export interface ParsedJob {
    title?: string;
    company?: string;
    companyWebsite?: string;
    type?: string;
    locations?: string[];
    skills?: string[];
    requiredSkills?: string[];
    experienceMin?: number | string;
    experienceMax?: number | string;
    salaryRange?: string;
    salaryMin?: number;
    salaryMax?: number;
    salaryAmount?: number | string;
    salaryPeriod?: string;
    jobFunction?: string;
    employmentType?: string;
    incentives?: string;
    selectionProcess?: string;
    notesHighlights?: string;
    allowedDegrees?: string[];
    allowedCourses?: string[];
    allowedSpecializations?: string[];
    allowedPassoutYears?: number[];
    sourceLink?: string;
    applyLink?: string;
    expiresAt?: string;
    workMode?: string;
    venueAddress?: string;
    venueLink?: string;
    dateRange?: string;
    timeRange?: string;
    startDate?: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
    requiredDocuments?: string[];
    contactPerson?: string;
    contactPhone?: string;
    description?: string;
    tags?: string[];
    governmentJobDetails?: {
        department?: string;
        organization?: string;
        recruitingBody?: string;
        officialWebsiteUrl?: string;
        officialNotificationUrl?: string;
        advertisementNumber?: string;
        postName?: string;
        applicationMode?: string;
        governmentLevel?: string;
        vacancyNature?: string;
        applicationStatus?: string;
        jobCategory?: string[];
        vacancyCount?: number | string;
        vacancyBreakdown?: Array<{
            postName: string;
            total?: number;
            categoryBreakup?: Record<string, number>;
            qualification?: string;
            age?: string;
        }>;
        applicationFee?: string;
        applicationFeeDetails?: {
            general?: number;
            obc?: number;
            ews?: number;
            sc?: number;
            st?: number;
            pwd?: number;
            female?: number;
            other?: Record<string, number>;
        };
        ageMin?: number | string;
        ageMax?: number | string;
        ageRelaxation?: string;
        eligibilityDetails?: {
            education?: string[];
            age?: { min?: number; max?: number; notes?: string };
            experience?: string[];
            additional?: string[];
        };
        reservationNotes?: string;
        importantInstructions?: string;
        applicationStartDate?: string;
        applicationEndDate?: string;
        examDate?: string;
        notificationIssuedDate?: string;
        examDates?: {
            prelims?: string;
            mains?: string;
            skillTest?: string;
            interview?: string;
            medical?: string;
            documentVerification?: string;
            other?: string;
        };
        admitCardDate?: string;
        resultDate?: string;
        selectionStages?: string[];
        requiredDocuments?: string[];
        requiredDocumentDetails?: Array<{
            name: string;
            mandatory?: boolean;
            notes?: string;
        }>;
        seoTags?: string[];
        examCenters?: string[];
        examPattern?: any;
        skillTests?: any;
        examStages?: any;
        importantDates?: any;
        qualificationDetails?: any;
        physicalStandards?: any;
        extraMetadata?: any;
        feeBreakdown?: any;
        ageRelaxationRules?: any;
        officialSourceVerified?: boolean;
        notificationPdfUrl?: string;
        admitCardUrl?: string;
        resultUrl?: string;
        answerKeyUrl?: string;
        syllabusUrl?: string;
        previousPapersUrl?: string;
    };
    walkInDetails?: {
        dateRange?: string;
        timeRange?: string;
        reportingTime?: string;
        venueAddress?: string;
        venueLink?: string;
        requiredDocuments?: string[];
        contactPerson?: string;
        contactPhone?: string;
        dates?: string[];
    };
}

export type DuplicateOpportunity = {
    id: string;
    title: string;
    company: string;
    sourceLink?: string;
    applyLink?: string;
    status: string;
    updatedAt: string;
};

export type TimelineEvent = {
    id: string;
    opportunityId: string;
    eventType: 'NOTIFICATION' | 'REG_START' | 'REG_END' | 'EXAM_DATE' | 'RESULT' | 'INTERVIEW' | 'DOC_VERIFICATION' | 'OTHER';
    eventDate: string;
    title: string;
    notes?: string | null;
    sourceLink?: string | null;
};

const normalizeKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export const tokenSet = (value: string) => new Set(normalizeKey(value).split(' ').filter(Boolean));

export const overlapRatio = (a: Set<string>, b: Set<string>) => {
    if (a.size === 0 || b.size === 0) return 0;
    let matches = 0;
    for (const token of a) {
        if (b.has(token)) matches += 1;
    }
    return matches / Math.max(a.size, b.size);
};

export const extractDomain = (value?: string | null) => {
    if (!value) return '';
    try {
        return new URL(value).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
        return '';
    }
};

export const typeParamToEnum = (value: string) => {
    const v = value.toLowerCase();
    if (v === 'job' || v === 'jobs') return 'JOB';
    if (v === 'internship' || v === 'internships') return 'INTERNSHIP';
    if (v === 'walk-in' || v === 'walkin' || v === 'walkins' || v === 'walk-ins') return 'WALKIN';
    return value.toUpperCase();
};

export const getPublicOpportunityUrl = (slugOrId: string, opportunityType: OpportunityKind) => {
    const configuredOrigin =
        process.env.NEXT_PUBLIC_SITE_URL
        || process.env.NEXT_PUBLIC_APP_URL
        || SITE_URL;
    const origin = /localhost|127\.0\.0\.1/i.test(configuredOrigin)
        ? SITE_URL
        : configuredOrigin;
    return `${origin}${getOpportunityPath(opportunityType, slugOrId)}`;
};

export const buildAdminSharePack = (payload: {
    title: string;
    company: string;
    type: OpportunityKind;
    slugOrId: string;
    locations: string[];
    allowedPassoutYears: number[];
    allowedCourses: string[];
    allowedDegrees: string[];
}) => {
    const publicUrl = getPublicOpportunityUrl(payload.slugOrId, payload.type);
    const normalizedLocations = (payload.locations || []).map((value) => value.trim()).filter(Boolean);
    const locationLine = normalizedLocations.length > 1
        ? normalizedLocations.join(' | ')
        : (normalizedLocations[0] || 'Remote');
    const locationTag = normalizedLocations.length === 1
        ? `#${normalizedLocations[0].replace(/[^a-zA-Z0-9]/g, '')}Jobs`
        : '';
    const sortedYears = [...(payload.allowedPassoutYears || [])]
        .filter((year) => Number.isFinite(year))
        .sort((a, b) => a - b);
    const batch = sortedYears.length > 0 ? sortedYears.join(', ') : 'Any';
    const educationLine = payload.allowedCourses?.length
        ? payload.allowedCourses.slice(0, 3).join(', ')
        : (payload.allowedDegrees?.length ? payload.allowedDegrees.join(', ') : 'Any Graduate');

    return [
        `${payload.title} - at ${payload.company}`,
        `location: ${locationLine}`,
        '',
        `Batch: ${batch}`,
        `Education: ${educationLine}`,
        '',
        `Apply: ${publicUrl}`,
        '',
        ['#FresherJobs', locationTag, '#FresherFlow'].filter(Boolean).join(' '),
    ].join('\n');
};

export const buildPlatformCaption = (platform: SharePlatform, payload: {
    title: string;
    company: string;
    type: OpportunityKind;
    slugOrId: string;
    allowedCourses: string[];
    allowedDegrees: string[];
}) => {
    const publicUrl = getPublicOpportunityUrl(payload.slugOrId, payload.type);
    const tracked = buildShareUrl(publicUrl, { platform, ref: 'admin_share', campaign: 'job_share' });
    const label = payload.type === 'WALKIN' ? 'Walk-in' : payload.type === 'INTERNSHIP' ? 'Internship' : 'Job';
    const educationLine = payload.allowedCourses?.length
        ? payload.allowedCourses.slice(0, 3).join(', ')
        : (payload.allowedDegrees?.length ? payload.allowedDegrees.join(', ') : 'Any Graduate');

    return [
        `${payload.title} at ${payload.company}`,
        `${label} listing on FresherFlow`,
        `Education: ${educationLine}`,
        tracked,
        '#FresherFlow #FresherJobs #OffCampus #Hiring',
    ].join('\n');
};

const normalizeTextValue = (value: string) =>
    value
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/\s+/g, ' ')
        .trim();

const uniqueValues = (items: string[]) => Array.from(new Set(items.map(normalizeTextValue).filter(Boolean)));

const DEGREE_ENUMS = ['DIPLOMA', 'DEGREE', 'PG'] as const;

const normalizeDegreeValue = (degree: string) => {
    const value = normalizeTextValue(degree).toLowerCase();
    if (
        value.includes('bachelor') ||
        value.includes('undergraduate') ||
        value === 'ug' ||
        value.includes('degree')
    ) return 'DEGREE';
    if (
        value.includes('master') ||
        value.includes('postgraduate') ||
        value.includes('post graduate') ||
        value === 'pg'
    ) return 'PG';
    if (value.includes('diploma') || value.includes('polytechnic') || value.includes('iti')) return 'DIPLOMA';
    return '';
};

export const toStringArray = (values: unknown) => {
    if (Array.isArray(values)) {
        return values.map((value) => {
            if (value && typeof value === 'object') {
                const valObj = value as Record<string, unknown>;
                if (typeof valObj.name === 'string') return valObj.name;
                if (typeof valObj.title === 'string') return valObj.title;
                if (typeof valObj.label === 'string') return valObj.label;
            }
            return String(value);
        });
    }
    if (typeof values === 'string') {
        return values.split(',').map((value) => value.trim()).filter(Boolean);
    }
    return [];
};

const normalizeDegrees = (values: unknown) => {
    return uniqueValues(
        toStringArray(values)
            .map((value) => normalizeDegreeValue(value))
            .filter((value): value is (typeof DEGREE_ENUMS)[number] => DEGREE_ENUMS.includes(value as (typeof DEGREE_ENUMS)[number]))
    );
};

const normalizeCourses = (values: unknown, type: 'course' | 'specialization') => {
    const normalize = type === 'course' ? normalizeCourseName : normalizeSpecializationName;
    return uniqueValues(
        toStringArray(values)
            .map((value) => normalize(value))
            .filter(Boolean)
    );
};

export const normalizeEducationPayload = (degreesInput: unknown, coursesInput: unknown, specializationsInput: unknown) => {
    const rawDegrees = toStringArray(degreesInput);
    const normalizedDegrees = normalizeDegrees(rawDegrees);
    const inferredCoursesFromDegrees = rawDegrees.filter((value) => !normalizeDegreeValue(value));
    const normalizedCourses = normalizeCourses([
        ...toStringArray(coursesInput),
        ...inferredCoursesFromDegrees,
    ], 'course');
    const normalizedSpecializations = normalizeCourses(specializationsInput, 'specialization');

    const degrees = normalizedDegrees.length > 0
        ? normalizedDegrees
        : (inferredCoursesFromDegrees.length > 0 ? ['DEGREE'] : []);

    return { degrees, courses: normalizedCourses, specializations: normalizedSpecializations };
};

export const normalizeSalaryPeriodValue = (value: unknown): 'YEARLY' | 'MONTHLY' | undefined => {
    const normalized = String(value || '').toLowerCase();
    if (normalized.includes('month')) return 'MONTHLY';
    if (normalized.includes('year') || normalized.includes('annum') || normalized.includes('lpa')) return 'YEARLY';
    return undefined;
};

export const normalizePassoutYears = (values: unknown) => {
    return toStringArray(values)
        .map((value) => parseInt(String(value).replace(/[^0-9]/g, ''), 10))
        .filter((value) => Number.isFinite(value));
};

export const normalizeWorkModeValue = (value: unknown): 'ONSITE' | 'HYBRID' | 'REMOTE' | undefined => {
    const normalized = String(value || '').toUpperCase();
    if (normalized.includes('ONSITE') || normalized.includes('OFFICE')) return 'ONSITE';
    if (normalized.includes('HYBRID')) return 'HYBRID';
    if (normalized.includes('REMOTE') || normalized.includes('HOME')) return 'REMOTE';
    return undefined;
};
