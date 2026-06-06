import { Prisma, OpportunityEventType, OpportunityStatus as DbOpportunityStatus, GovernmentLevel, VacancyNature, GovernmentApplicationStatus } from '@fresherflow/database';
import { OpportunityStatus, OpportunityType, EducationLevel } from '@fresherflow/types';
import { extractDegreesFromQualifications, deriveGovtLocations } from '@fresherflow/constants';
import { normalizeEducationBuckets } from '@fresherflow/domain';
import { AdminOpportunityRequest } from '../../../types/admin';

// ── Type normalisation ────────────────────────────────────────────────────────

export type AdminStatusFilter = OpportunityStatus | 'EXPIRED' | 'DELETED' | 'LIVE';

export function normalizeTypeParam(raw?: string): OpportunityType | undefined {
    if (!raw) return undefined;
    const value = raw.toLowerCase();
    if (value === 'job' || value === 'jobs') return OpportunityType.JOB;
    if (value === 'internship' || value === 'internships') return OpportunityType.INTERNSHIP;
    if (value === 'walk-in' || value === 'walkin' || value === 'walkins' || value === 'walk-ins') return OpportunityType.WALKIN;
    const upper = raw.toUpperCase();
    if (Object.values(OpportunityType).includes(upper as OpportunityType)) return upper as OpportunityType;
    return undefined;
}

export function parseAdminStatusFilter(raw?: string): AdminStatusFilter | undefined {
    if (!raw) return undefined;
    const normalized = raw.toUpperCase();
    if (normalized === 'EXPIRED') return 'EXPIRED';
    if (normalized === 'DELETED') return 'DELETED';
    if (normalized === 'LIVE') return 'LIVE';
    if (Object.values(OpportunityStatus).includes(normalized as OpportunityStatus)) {
        return normalized as OpportunityStatus;
    }
    return undefined;
}

export function parseEventType(raw?: string): OpportunityEventType {
    const fallback = OpportunityEventType.OTHER;
    if (!raw) return fallback;
    const normalized = raw.toUpperCase();
    return Object.values(OpportunityEventType).includes(normalized as OpportunityEventType)
        ? (normalized as OpportunityEventType)
        : fallback;
}

// ── Prisma where builders ─────────────────────────────────────────────────────

export function buildExpiredWhere(now: Date): Prisma.OpportunityWhereInput {
    return {
        status: OpportunityStatus.PUBLISHED as unknown as DbOpportunityStatus,
        deletedAt: null,
        OR: [
            { expiredAt: { not: null } },
            { expiresAt: { lte: now } },
        ],
    };
}

// ── Date helpers ──────────────────────────────────────────────────────────────

export function toDateOrNull(value: unknown): Date | null {
    if (!value || typeof value !== 'string') return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
}

export function normalizeWalkInDates(data: AdminOpportunityRequest): Date[] {
    const walkInDetails = data?.walkInDetails || {};
    const rawDates: string[] = [];
    if (Array.isArray(walkInDetails.dates)) rawDates.push(...walkInDetails.dates);
    else if (typeof walkInDetails.date === 'string') rawDates.push(walkInDetails.date);
    if (typeof data?.startDate === 'string') rawDates.push(data.startDate);
    if (typeof data?.endDate === 'string') rawDates.push(data.endDate);
    return rawDates.map(toDateOrNull).filter((v): v is Date => Boolean(v));
}

export function deriveOpportunityExpiryDate(data: AdminOpportunityRequest, type: OpportunityType): Date | null {
    const explicit = toDateOrNull(data?.expiresAt);
    if (explicit) return explicit;
    if (type !== OpportunityType.WALKIN) return null;
    const walkInDates = normalizeWalkInDates(data);
    if (walkInDates.length === 0) return null;
    const endDate = new Date(Math.max(...walkInDates.map(d => d.getTime())));
    endDate.setHours(23, 59, 59, 999);
    return endDate;
}

// ── Govt education / location extraction ─────────────────────────────────────

/**
 * Maps freetext qualification strings from qualificationDetails[]
 * to the EducationLevel enum values used for profile matching.
 * The MINIMUM qualification across all posts is always included so
 * the widest possible candidate pool can see the listing.
 */
/** Delegates to govtTaxonomy — single source of truth in packages/constants */
export function extractGovtDegrees(qualificationDetails: unknown[]): EducationLevel[] {
    return extractDegreesFromQualifications(qualificationDetails);
}

/** Delegates to govtTaxonomy — single source of truth in packages/constants */
export function extractGovtLocations(
    details: { governmentLevel?: string; examCenters?: string[]; recruitingBody?: string } | undefined,
    existingLocations: string[]
): string[] {
    return deriveGovtLocations(details?.governmentLevel, details?.examCenters, existingLocations);
}

export function normalizeEducationRequirements(
    data: AdminOpportunityRequest,
    govtDetails?: { qualificationDetails?: unknown[] }
) {
    const normalized = normalizeEducationBuckets(
        data.allowedCourses || [],
        data.allowedSpecializations || []
    );

    // If admin didn't provide explicit degrees AND this is a govt job,
    // auto-extract from qualificationDetails for profile matching
    let degrees: EducationLevel[] = Array.isArray(data.allowedDegrees) ? data.allowedDegrees as EducationLevel[] : [];
    if (degrees.length === 0 && govtDetails?.qualificationDetails?.length) {
        degrees = extractGovtDegrees(govtDetails.qualificationDetails);
    }

    return {
        allowedDegrees: degrees,
        allowedCourses: normalized.allowedCourses,
        allowedSpecializations: normalized.allowedSpecializations,
    };
}


export function buildWalkInCreate(data: AdminOpportunityRequest) {
    const walkInDetails = data.walkInDetails || {};
    const dates = normalizeWalkInDates(data);
    const venueAddress = walkInDetails.venueAddress || walkInDetails.venue;
    const reportingTime = walkInDetails.reportingTime || walkInDetails.startTime;
    if (!venueAddress) return undefined;
    return {
        create: {
            dates,
            dateRange: walkInDetails.dateRange,
            timeRange: walkInDetails.timeRange,
            venueAddress,
            venueLink: walkInDetails.venueLink,
            reportingTime: reportingTime || 'Contact for timing',
            requiredDocuments: walkInDetails.requiredDocuments || [],
            contactPerson: walkInDetails.contactPerson,
            contactPhone: walkInDetails.contactPhone,
        },
    };
}

export function buildWalkInUpsert(data: AdminOpportunityRequest) {
    const walkInDetails = data.walkInDetails || {};
    const dates = normalizeWalkInDates(data);
    const venueAddress = walkInDetails.venueAddress || walkInDetails.venue;
    const reportingTime = walkInDetails.reportingTime || walkInDetails.startTime;
    const fields = {
        dates,
        dateRange: walkInDetails.dateRange,
        timeRange: walkInDetails.timeRange,
        venueAddress: venueAddress!,
        venueLink: walkInDetails.venueLink,
        reportingTime: reportingTime || 'Contact for timing',
        requiredDocuments: walkInDetails.requiredDocuments || [],
        contactPerson: walkInDetails.contactPerson,
        contactPhone: walkInDetails.contactPhone,
    };
    return { upsert: { create: fields, update: fields } };
}

function compactString(value: unknown) {
    const normalized = String(value ?? '').trim();
    return normalized.length > 0 ? normalized : undefined;
}

function compactStringArray(values: unknown) {
    if (!Array.isArray(values)) return [];
    return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
}

export function buildGovernmentTags(data: AdminOpportunityRequest) {
    const explicitTags = compactStringArray(data.tags);
    const details = data.governmentJobDetails;
    if (!details && explicitTags.length === 0) return [];
    
    const detailTags = compactStringArray(details?.seoTags || []);
    
    const autoTags = compactStringArray([
        'Government Job',
        details?.recruitingBody || details?.organization,
        'CENTRAL',
        details?.applicationModes?.[0] || 'ONLINE',
        data.jobFunction,
    ]);

    return Array.from(new Set([...explicitTags, ...detailTags, ...autoTags]));
}

export function buildGovernmentJobDetailsCreate(data: AdminOpportunityRequest) {
    const details = data.governmentJobDetails;
    if (!details) return undefined;

    // Map legacy payload fields to new Prisma schema
    const payload = {
        recruitingBody: compactString(details.recruitingBody) || compactString(details.organization) || undefined,
        advertisementNumber: compactString(details.advertisementNumber),
        governmentLevel: (details.governmentLevel && Object.values(GovernmentLevel).includes(details.governmentLevel as GovernmentLevel)
            ? (details.governmentLevel as GovernmentLevel)
            : 'CENTRAL' as GovernmentLevel),
        vacancyNature: (details.vacancyNature && Object.values(VacancyNature).includes(details.vacancyNature as VacancyNature)
            ? (details.vacancyNature as VacancyNature)
            : 'PERMANENT' as VacancyNature),
        importantDates: details.importantDates 
            ? (details.importantDates as unknown as Prisma.InputJsonValue) 
            : (details.examDates 
                ? (details.examDates as unknown as Prisma.InputJsonValue) 
                : {
                    applicationStartDate: details.applicationStartDate,
                    applicationEndDate: details.applicationEndDate,
                    examDate: details.examDate,
                    admitCardDate: details.admitCardDate,
                    resultDate: details.resultDate
                } as unknown as Prisma.InputJsonValue),
        examStages: details.examStages ? (details.examStages as unknown as Prisma.InputJsonValue) : undefined,
        applicationFee: compactString(details.applicationFee),
        applicationFeeDetails: details.applicationFeeDetails ? (details.applicationFeeDetails as unknown as Prisma.InputJsonValue) : undefined,
        feeBreakdown: details.feeBreakdown ? (details.feeBreakdown as unknown as Prisma.InputJsonValue) : undefined,
        vacancyCount: typeof details.vacancyCount === 'number' ? details.vacancyCount : undefined,
        vacancyBreakdown: (details.vacancyBreakdown || details.vacancies) ? ((details.vacancyBreakdown || details.vacancies) as unknown as Prisma.InputJsonValue) : undefined,
        ageMin: typeof details.ageMin === 'number' ? details.ageMin : undefined,
        ageMax: typeof details.ageMax === 'number' ? details.ageMax : undefined,
        ageRelaxationRules: (details.ageRelaxationRules || (details.ageRelaxation ? [{ category: "General", rule: details.ageRelaxation }] : undefined)) as unknown as Prisma.InputJsonValue | undefined,
        qualificationDetails: (details.qualificationDetails || details.eligibilityDetails) ? ((details.qualificationDetails || details.eligibilityDetails) as unknown as Prisma.InputJsonValue) : undefined,
        physicalStandards: details.physicalStandards ? (details.physicalStandards as unknown as Prisma.InputJsonValue) : undefined,
        selectionStages: (details.selectionStages && Array.isArray(details.selectionStages)) 
            ? details.selectionStages 
            : compactStringArray(details.selectionStages),
        skillTests: details.skillTests ? (details.skillTests as unknown as Prisma.InputJsonValue) : undefined,
        examPattern: details.examPattern ? (details.examPattern as unknown as Prisma.InputJsonValue) : undefined,
        basicPay: undefined as number | undefined,
        payLevel: undefined as string | undefined,
        examCenters: compactStringArray(details.examCenters),
        requiredDocuments: compactStringArray(details.requiredDocuments),
        requiredDocumentDetails: details.requiredDocumentDetails ? (details.requiredDocumentDetails as unknown as Prisma.InputJsonValue) : undefined,
        applicationMode: (compactString(details.applicationMode) || (compactStringArray(details.applicationModes)?.[0] || 'ONLINE')) as string,
        importantInstructions: compactString(details.importantInstructions),
        notificationPdfUrl: compactString(details.notificationPdfUrl),
        officialNotificationUrl: compactString(details.officialNotificationUrl),
        admitCardUrl: compactString(details.admitCardUrl),
        resultUrl: compactString(details.resultUrl),
        answerKeyUrl: compactString(details.answerKeyUrl),
        syllabusUrl: compactString(details.syllabusUrl),
        previousPapersUrl: compactString(details.previousPapersUrl),
        applicationStatus: (details.applicationStatus && Object.values(GovernmentApplicationStatus).includes(details.applicationStatus as GovernmentApplicationStatus)
            ? (details.applicationStatus as GovernmentApplicationStatus)
            : 'UPCOMING' as GovernmentApplicationStatus),
        jobCategory: details.jobCategory || [],
        extraMetadata: (details.extraMetadata && typeof details.extraMetadata === 'object'
            ? {
                department: details.department,
                postName: details.postName,
                reservationNotes: details.reservationNotes,
                requiredDocuments: details.requiredDocuments,
                requiredDocumentDetails: details.requiredDocumentDetails,
                seoTags: details.seoTags,
                officialWebsiteUrl: details.officialWebsiteUrl,
                ...(details.extraMetadata as Record<string, unknown>)
              }
            : {
                department: details.department,
                postName: details.postName,
                reservationNotes: details.reservationNotes,
                requiredDocuments: details.requiredDocuments,
                requiredDocumentDetails: details.requiredDocumentDetails,
                seoTags: details.seoTags,
                officialWebsiteUrl: details.officialWebsiteUrl
            }) as unknown as Prisma.InputJsonValue,
    };

    const hasValue = Object.values(payload).some((value) => Array.isArray(value) ? value.length > 0 : value !== undefined);
    return hasValue ? { create: payload } : undefined;
}

export function buildGovernmentJobDetailsUpsert(data: AdminOpportunityRequest) {
    const built = buildGovernmentJobDetailsCreate(data);
    if (!built) return undefined;
    return { upsert: { create: built.create, update: built.create } };
}

// ── CSV helpers ───────────────────────────────────────────────────────────────

export function toCsvValue(value: unknown): string {
    if (value === null || value === undefined) return '';
    const stringValue = Array.isArray(value) ? value.join(' | ') : String(value);
    const escaped = stringValue.replace(/"/g, '""');
    return `"${escaped}"`;
}

// ── Alert helpers ─────────────────────────────────────────────────────────────

import { sendNewJobAlerts } from '../../../infrastructure/services/notification.service';
import { logger } from '@fresherflow/logger';

export function queueNewJobAlerts(opportunityId: string) {
    sendNewJobAlerts(opportunityId).catch((error) => {
        logger.error('Failed to dispatch new job alerts', {
            opportunityId,
            error: error instanceof Error ? error.message : String(error),
        });
    });
}
