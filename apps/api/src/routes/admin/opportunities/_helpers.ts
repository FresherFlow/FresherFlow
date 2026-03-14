import { Prisma, OpportunityEventType } from '@fresherflow/database';
import { OpportunityStatus, OpportunityType } from '@fresherflow/types';
import { normalizeEducationBuckets } from '@fresherflow/utils';
import { AdminOpportunityRequest } from '../../../types/admin';

// ── Type normalisation ────────────────────────────────────────────────────────

export type AdminStatusFilter = OpportunityStatus | 'EXPIRED' | 'DELETED';

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
        status: OpportunityStatus.PUBLISHED,
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

export function normalizeEducationRequirements(data: AdminOpportunityRequest) {
    const normalized = normalizeEducationBuckets(
        data.allowedCourses || [],
        data.allowedSpecializations || []
    );
    return {
        allowedDegrees: Array.isArray(data.allowedDegrees) ? data.allowedDegrees : [],
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

// ── CSV helpers ───────────────────────────────────────────────────────────────

export function toCsvValue(value: unknown): string {
    if (value === null || value === undefined) return '';
    const stringValue = Array.isArray(value) ? value.join(' | ') : String(value);
    const escaped = stringValue.replace(/"/g, '""');
    return `"${escaped}"`;
}

// ── Alert helpers ─────────────────────────────────────────────────────────────

import { sendNewJobAlerts } from '../../../services/notification.service';
import { logger } from '@fresherflow/logger';

export function queueNewJobAlerts(opportunityId: string) {
    sendNewJobAlerts(opportunityId).catch((error) => {
        logger.error('Failed to dispatch new job alerts', {
            opportunityId,
            error: error instanceof Error ? error.message : String(error),
        });
    });
}
