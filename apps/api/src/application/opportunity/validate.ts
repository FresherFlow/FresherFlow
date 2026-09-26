import type { Prisma } from '../../infrastructure/database/prisma';

/**
 * Phase 5 — opportunity validation and duplicate protection.
 *
 * Pure helpers (no DB) so they are unit-testable and shared by the admin
 * create route, the ingest-draft pipeline, and the application create use
 * case. Lifecycle: create → validate → draft → publish → update →
 * expire/archive → soft-delete. Nothing here touches SavedSearch or Room;
 * those are separate matching/curation concerns.
 */

export interface OpportunityValidationError {
    field: string;
    message: string;
}

export interface ValidatableOpportunityInput {
    title?: unknown;
    company?: unknown;
    applyLink?: unknown;
    sourceLink?: unknown;
    sourceExternalId?: unknown;
    salaryMin?: unknown;
    salaryMax?: unknown;
    experienceMin?: unknown;
    experienceMax?: unknown;
    applicationDeadline?: unknown;
    registrationDeadline?: unknown;
    expiresAt?: unknown;
    startsAt?: unknown;
    endsAt?: unknown;
    category?: unknown;
    recruitmentMethod?: unknown;
    sector?: unknown;
    organizationId?: unknown;
    sourceKind?: unknown;
    governmentJobDetails?: unknown;
    driveDetails?: unknown;
    eventDetails?: unknown;
}

function asDate(value: unknown): Date | undefined {
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value;
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function asNumber(value: unknown): number | undefined {
    if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
    if (typeof value !== 'string') return undefined;
    if (!/^-?\d+(\.\d+)?$/.test(value.trim())) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Validate an opportunity payload before it reaches Prisma.
 * Returns a list of field errors; empty means valid.
 * Never throws — callers map a non-empty list to 400.
 */
export function validateOpportunityInput(data: ValidatableOpportunityInput): OpportunityValidationError[] {
    const errors: OpportunityValidationError[] = [];

    const title = typeof data.title === 'string' ? data.title.trim() : '';
    if (!title) errors.push({ field: 'title', message: 'Title is required' });

    const company = typeof data.company === 'string' ? data.company.trim() : '';
    if (!company) errors.push({ field: 'company', message: 'Company is required' });

    const applyLink = typeof data.applyLink === 'string' ? data.applyLink.trim() : '';
    const sourceLink = typeof data.sourceLink === 'string' ? data.sourceLink.trim() : '';
    const method = typeof data.recruitmentMethod === 'string' ? data.recruitmentMethod : '';
    const isWalkIn = method === 'WALK_IN';
    if (!isWalkIn && !applyLink && !sourceLink) {
        errors.push({
            field: 'applyLink',
            message: 'At least one of applyLink or sourceLink is required',
        });
    }

    const salaryMin = asNumber(data.salaryMin);
    const salaryMax = asNumber(data.salaryMax);
    if (salaryMin !== undefined && salaryMin < 0) {
        errors.push({ field: 'salaryMin', message: 'salaryMin cannot be negative' });
    }
    if (salaryMax !== undefined && salaryMax < 0) {
        errors.push({ field: 'salaryMax', message: 'salaryMax cannot be negative' });
    }

    const expMin = asNumber(data.experienceMin);
    const expMax = asNumber(data.experienceMax);
    if (expMin !== undefined && (expMin < 0 || expMin > 30)) {
        errors.push({ field: 'experienceMin', message: 'experienceMin must be between 0 and 30' });
    }
    if (expMax !== undefined && (expMax < 0 || expMax > 30)) {
        errors.push({ field: 'experienceMax', message: 'experienceMax must be between 0 and 30' });
    }

    const category = typeof data.category === 'string' ? data.category : '';
    const isGovtSector = data.sector === 'GOVERNMENT';
    if ((isGovtSector || category === 'GOVERNMENT') && !data.governmentJobDetails) {
        errors.push({
            field: 'governmentJobDetails',
            message: 'Government listings require governmentJobDetails',
        });
    }
    if (isWalkIn && !data.driveDetails) {
        errors.push({
            field: 'driveDetails',
            message: 'Drive-based listings require driveDetails',
        });
    }
    if ((category === 'COMPETITION' || category === 'EVENT') && !data.eventDetails) {
        // Soft requirement: competitions/events should carry dates or details.
        const hasDeadline =
            asDate(data.registrationDeadline) !== undefined ||
            asDate(data.applicationDeadline) !== undefined ||
            asDate(data.startsAt) !== undefined;
        if (!hasDeadline) {
            errors.push({
                field: 'registrationDeadline',
                message: 'Competitions and events require a registration deadline or start date',
            });
        }
    }

    const startsAt = asDate(data.startsAt);
    const endsAt = asDate(data.endsAt);
    if (startsAt && endsAt && endsAt < startsAt) {
        errors.push({ field: 'endsAt', message: 'endsAt cannot be before startsAt' });
    }

    return errors;
}

/**
 * Build the OR-list for duplicate detection across the three stable
 * identities: canonical apply link, original source link, and the upstream
 * external id (ATS/feed). Cross-checks both columns because scrapers swap
 * which column they store the canonical URL in.
 */
export function buildDuplicateWhere(data: {
    applyLink?: string | null;
    sourceLink?: string | null;
    sourceExternalId?: string | null;
}): Prisma.OpportunityWhereInput[] {
    const filters: Prisma.OpportunityWhereInput[] = [];
    const applyLink = typeof data.applyLink === 'string' ? data.applyLink.trim() : '';
    const sourceLink = typeof data.sourceLink === 'string' ? data.sourceLink.trim() : '';
    const externalId = typeof data.sourceExternalId === 'string' ? data.sourceExternalId.trim() : '';

    if (applyLink) {
        filters.push({ applyLink });
        filters.push({ sourceLink: applyLink });
    }
    if (sourceLink && sourceLink !== applyLink) {
        filters.push({ sourceLink });
        filters.push({ applyLink: sourceLink });
    }
    if (externalId) filters.push({ sourceExternalId: externalId });

    return filters;
}
