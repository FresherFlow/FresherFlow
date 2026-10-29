/**
 * The promote step — the missing link between "a job was discovered" and
 * "a job is live on the board".
 *
 * WHY THIS EXISTS: discovery produces hundreds of rows a day and the feed
 * serves whatever is marked PUBLISHED. Until now the only thing that could
 * turn a discovered job into a live listing was a human clicking a button in
 * the admin UI, so the board ran dry and the two headline sections
 * ("Walk-in Drives", "Government") had nothing to show.
 *
 * WHY IT IS NOT JUST "publish everything": the legacy backlog is mostly
 * misclassified, fabricated rows. 210 of the 215 DRAFT rows are `WALKIN`
 * rows whose venue, reporting time, document checklist and dates were
 * synthesised by `parseWalkInDetails` — every one of them claims
 * "Hyderabad, 10:00 AM - 1:00 PM, reporting time 9:30 AM" for what is
 * really an ordinary Internshala or LinkedIn posting. Publishing that
 * backlog without a gate would put ~210 fabricated drives on a public job
 * board. So every row has to pass a gate first.
 *
 * THE GATES (in order):
 *
 *   1. FRESHNESS   — the row must have been seen recently. A job posting
 *                    from six weeks ago is not what "discovered today" means,
 *                    and filling the board with archaeology is the same
 *                    failure as an empty board.
 *   2. TRUST       — the apply link must be on a first-party ATS host
 *                    (`isTrustedListingUrl`, shared with the queue's
 *                    ingestion processor). An ATS posting is a factual copy
 *                    of the employer's own page, so publishing it is not a
 *                    judgement call. Everything else needs a human.
 *   3. DRIVE       — a row that looks like a walk-in drive must carry real
 *                    drive facts: a date, a venue that is not a bare city,
 *                    and a way to be contacted. A row whose drive fields were
 *                    synthesised stays DRAFT for human review.
 *
 * A row that fails any gate is LEFT ALONE. The promote step never rejects,
 * never expires and never rewrites a legacy row: the gate's job is to decide
 * what goes live, and everything else keeps waiting for a human.
 *
 * Idempotency: the write path dedupes on `applyLink`, and a row whose
 * listing is already live is skipped. Running this twice publishes once.
 */

import { pool, hasDb } from '@fresherflow/pipeline/db/pool';
import {
    getListingHostname,
    isPlausibleVenueAddress,
    isTrustedListingUrl,
    logger,
} from '@fresherflow/utils';
import prisma from '../../infrastructure/database/prisma';
import { opportunitySchema } from '../../utils/validation';
import { createListing, ListingWriteError } from '../opportunity/listingWrite';
import type { ExtendedAdminOpportunityData } from '../opportunity/listingPayload';

/** Where a candidate came from. Only for reporting. */
export type PromoteSource = 'processed_jobs' | 'discovered_jobs';

/** Why a candidate was not published. */
export type PromoteHoldReason =
    | 'stale'
    | 'untrusted-host'
    | 'no-apply-link'
    | 'incomplete-listing'
    | 'drive-without-date'
    | 'drive-without-venue'
    | 'drive-without-contact'
    | 'already-published'
    | 'existing-draft';

export interface PromoteHold {
    source: PromoteSource;
    id: string;
    applyLink: string | null;
    hostname: string | null;
    reason: PromoteHoldReason;
    detail: string;
}

export interface PromoteReport {
    /** Rows read from the legacy ingestion database. */
    scanned: number;
    /** Rows that passed every gate and are now live. */
    published: number;
    /** Rows that passed the gates but were already live (idempotent re-run). */
    alreadyPublished: number;
    /** Rows held back by a gate. */
    held: number;
    /** Rows that failed to write. */
    failed: number;
    /** Rows skipped because they were not candidates (bad shape, no link). */
    skipped: number;
    holds: PromoteHold[];
    durationMs: number;
}

export interface PromoteOptions {
    /** Maximum number of rows read per source table. */
    limit?: number;
    /**
     * How old a candidate may be, in days. Defaults to
     * `PROMOTE_MAX_AGE_DAYS` (14) or 14 when the env var is unset.
     */
    maxAgeDays?: number;
    /** When true, nothing is written. The report still shows what would happen. */
    dryRun?: boolean;
}

/** The placeholder the processor writes when a drive has no parsed date. */
const SYNTHETIC_DATE_LABEL = 'active walk-in';

/** Contact names that mean "nobody" and therefore are not a contact. */
const GENERIC_CONTACT_NAMES = new Set([
    'hr', 'admin', 'administrator', 'team', 'company', 'support', 'recruiter',
    'talent acquisition', 'human resources', 'office', 'management', 'staff',
    'hr team', 'recruitment team', 'n a', 'na', 'none', 'tbd',
]);

const VALID_DEGREES = new Set(['TENTH', 'INTER', 'DIPLOMA', 'DEGREE', 'PG']);
const VALID_WORK_MODES = new Set(['ONSITE', 'HYBRID', 'REMOTE']);
const VALID_SALARY_PERIODS = new Set(['MONTHLY', 'YEARLY']);
const VALID_APPLICATION_METHODS = new Set(['DIRECT', 'FORM', 'ASSESSMENT']);

/** A legacy `processed_jobs` row, as far as this module needs it. */
interface ProcessedJobCandidate {
    id: string;
    title: string | null;
    company: string | null;
    description: string | null;
    type: string | null;
    apply_link: string | null;
    source_url: string | null;
    company_website: string | null;
    company_logo_url: string | null;
    locations: string[] | null;
    structured_locations: unknown;
    required_skills: string[] | null;
    allowed_degrees: string[] | null;
    allowed_courses: string[] | null;
    allowed_specializations: string[] | null;
    allowed_passout_years: number[] | null;
    work_mode: string | null;
    experience_min: number | null;
    experience_max: number | null;
    salary_range: string | null;
    salary_period: string | null;
    employment_type: string | null;
    job_function: string | null;
    incentives: string | null;
    selection_process: string | null;
    notes_highlights: string | null;
    application_details: unknown;
    walk_in_details: unknown;
    updated_at: Date | null;
    created_at: Date | null;
}

/** A legacy `discovered_jobs` row, as far as this module needs it. */
interface DiscoveredJobCandidate {
    id: string;
    title: string | null;
    company: string | null;
    description: string | null;
    apply_link: string | null;
    source_url: string | null;
    company_url: string | null;
    company_logo_url: string | null;
    location: string | null;
    location_city: string | null;
    employment_type: string | null;
    experience_years: number | null;
    salary_min: number | null;
    salary_max: number | null;
    salary_currency: string | null;
    salary_interval: string | null;
    skills: string | null;
    posted_at: string | null;
    venue_address: string | null;
    cluster_name: string | null;
    latitude: number | null;
    longitude: number | null;
    walkin_date: string | null;
    walkin_time: string | null;
    reporting_time: string | null;
    contact_person: string | null;
    contact_phone: string | null;
    required_docs: string | null;
    updated_at: Date | null;
    created_at: Date | null;
}

const PROCESSED_JOB_COLUMNS = `
    id, title, company, description, type, apply_link, source_url,
    company_website, company_logo_url, locations, structured_locations,
    required_skills, allowed_degrees, allowed_courses, allowed_specializations,
    allowed_passout_years, work_mode, experience_min, experience_max,
    salary_range, salary_period, employment_type, job_function, incentives,
    selection_process, notes_highlights, application_details, walk_in_details,
    updated_at, created_at
`;

const DISCOVERED_JOB_COLUMNS = `
    id, title, company, description, apply_link, source_url, company_url,
    company_logo_url, location, location_city, employment_type, experience_years,
    salary_min, salary_max, salary_currency, salary_interval, skills, posted_at,
    venue_address, cluster_name, latitude, longitude, walkin_date, walkin_time,
    reporting_time, contact_person, contact_phone, required_docs,
    updated_at, created_at
`;

function resolveMaxAgeDays(explicit?: number): number {
    if (typeof explicit === 'number' && Number.isFinite(explicit) && explicit > 0) {
        return Math.floor(explicit);
    }
    const fromEnv = Number.parseInt(process.env.PROMOTE_MAX_AGE_DAYS ?? '', 10);
    if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
    return 14;
}

function isFresh(timestamp: Date | string | null | undefined, maxAgeDays: number): boolean {
    if (!timestamp) return false;
    const parsed = timestamp instanceof Date ? timestamp : new Date(timestamp);
    if (Number.isNaN(parsed.getTime())) return false;
    const ageMs = Date.now() - parsed.getTime();
    // A row dated in the future is treated as fresh (clock skew, re-import).
    if (ageMs < 0) return true;
    return ageMs <= maxAgeDays * 24 * 60 * 60 * 1000;
}

/** Parse a JSONB column that node-pg may hand back as a string. */
function parseJsonColumn(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        return value as Record<string, unknown>;
    }
    if (typeof value === 'string' && value.trim().length > 0) {
        try {
            const parsed = JSON.parse(value);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return parsed as Record<string, unknown>;
            }
        } catch {
            return {};
        }
    }
    return {};
}

function asStringArray(value: unknown): string[] {
    if (Array.isArray(value)) return value.map((entry) => String(entry)).filter(Boolean);
    if (typeof value === 'string' && value.trim().length > 0) {
        return value.split(',').map((entry) => entry.trim()).filter(Boolean);
    }
    return [];
}

function asTrimmedString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

/** A URL that the listing contract will accept, or null. */
function asHttpUrl(value: unknown): string | null {
    const trimmed = asTrimmedString(value);
    if (!trimmed) return null;
    try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
        return parsed.toString();
    } catch {
        return null;
    }
}

/** The drive facts of a row, however they were stored. */
interface DriveFacts {
    dates: string[];
    dateRange: string | null;
    timeRange: string | null;
    venueAddress: string | null;
    reportingTime: string | null;
    contactPerson: string | null;
    contactPhone: string | null;
    requiredDocuments: string[];
    city: string | null;
    clusterName: string | null;
    latitude: number | null;
    longitude: number | null;
}

function readDriveFacts(
    walkInDetails: unknown,
    fallback: Partial<DriveFacts> = {},
): DriveFacts {
    const details = parseJsonColumn(walkInDetails);
    return {
        dates: asStringArray(details.dates),
        dateRange: asTrimmedString(details.dateRange) ?? fallback.dateRange ?? null,
        timeRange: asTrimmedString(details.timeRange) ?? fallback.timeRange ?? null,
        venueAddress: asTrimmedString(details.venueAddress) ?? fallback.venueAddress ?? null,
        reportingTime: asTrimmedString(details.reportingTime) ?? fallback.reportingTime ?? null,
        contactPerson: asTrimmedString(details.contactPerson) ?? fallback.contactPerson ?? null,
        contactPhone: asTrimmedString(details.contactPhone) ?? fallback.contactPhone ?? null,
        requiredDocuments: asStringArray(details.requiredDocuments ?? fallback.requiredDocuments),
        city: fallback.city ?? null,
        clusterName: fallback.clusterName ?? null,
        latitude: fallback.latitude ?? null,
        longitude: fallback.longitude ?? null,
    };
}

/**
 * Is the contact block a real contact?
 *
 * A generic name ("HR Team") is not a contact: it tells a fresher nothing
 * about who to ask for when they arrive.
 */
function hasUsableContact(drive: DriveFacts): boolean {
    const phone = drive.contactPhone?.replace(/[^0-9+]/g, '') ?? '';
    if (phone.replace(/\D/g, '').length >= 10) return true;

    const person = drive.contactPerson?.trim();
    if (!person) return false;
    const normalized = person.toLowerCase().replace(/\s+/g, ' ').replace(/\./g, '');
    if (GENERIC_CONTACT_NAMES.has(normalized)) return false;
    // A single letter or a pure placeholder is not a person.
    if (normalized.length < 3) return false;
    return true;
}

/**
 * Does the drive carry a date that was actually stated?
 *
 * `parseWalkInDetails` invents an expiry ("now + 3 days at 5:00 PM") when the
 * source has no date, and labels the drive "Active Walk-in". A date that
 * exists only because of that fallback is not a real date, so a drive whose
 * only date label is the placeholder is treated as dateless.
 */
function hasRealDriveDate(drive: DriveFacts): boolean {
    if (drive.dates.length === 0) return false;
    const label = drive.dateRange?.trim().toLowerCase();
    if (!label) return false;
    if (label === SYNTHETIC_DATE_LABEL || label === 'active' || label === 'active drive') {
        return false;
    }
    return true;
}

/** A row that looks like a drive must pass the drive gate. */
export function checkDriveGate(
    drive: DriveFacts,
    city: string | null,
): PromoteHoldReason | null {
    if (!hasRealDriveDate(drive)) return 'drive-without-date';
    if (!isPlausibleVenueAddress(drive.venueAddress, city)) return 'drive-without-venue';
    if (!hasUsableContact(drive)) return 'drive-without-contact';
    return null;
}

interface ListingCandidateInput {
    title: string;
    company: string;
    description: string | null;
    applyLink: string | null;
    sourceLink: string | null;
    companyWebsite: string | null;
    companyLogoUrl: string | null;
    locations: string[];
    requiredSkills: string[];
    allowedDegrees: string[];
    allowedCourses: string[];
    allowedSpecializations: string[];
    allowedPassoutYears: number[];
    workMode: string | null;
    experienceMin: number | null;
    experienceMax: number | null;
    salaryRange: string | null;
    salaryPeriod: string | null;
    employmentTypes: string | null;
    jobFunction: string | null;
    incentives: string | null;
    selectionProcess: string | null;
    notesHighlights: string | null;
    applicationDetails: Record<string, unknown> | null;
    isWalkIn: boolean;
    driveDetails: Record<string, unknown> | undefined;
}

/**
 * Map a legacy row onto the admin listing contract.
 *
 * Every field is sanitised here because `opportunitySchema` is a CLOSED
 * object: an unknown key is stripped, and an invalid value is a hard parse
 * error. A row with a malformed work mode must be dropped to DRAFT for a
 * human, not crash the whole cycle.
 */
function buildListingPayload(candidate: ListingCandidateInput) {
    const description = candidate.description && candidate.description.length >= 10
        ? candidate.description
        : null;

    const workMode = candidate.workMode
        ? candidate.workMode.toUpperCase()
        : null;

    const salaryPeriod = candidate.salaryPeriod
        ? candidate.salaryPeriod.toUpperCase()
        : null;

    const applicationDetails = sanitizeApplicationDetails(candidate.applicationDetails);

    return {
        title: candidate.title,
        company: candidate.company,
        description,
        applyLink: candidate.applyLink,
        sourceLink: candidate.sourceLink,
        companyWebsite: candidate.companyWebsite,
        companyLogoUrl: candidate.companyLogoUrl,
        locations: candidate.locations,
        requiredSkills: candidate.requiredSkills,
        allowedDegrees: candidate.allowedDegrees.filter((degree) => VALID_DEGREES.has(degree)),
        allowedCourses: candidate.allowedCourses,
        allowedSpecializations: candidate.allowedSpecializations,
        allowedPassoutYears: candidate.allowedPassoutYears,
        workMode: workMode && VALID_WORK_MODES.has(workMode) ? workMode : null,
        experienceMin: candidate.experienceMin ?? undefined,
        experienceMax: candidate.experienceMax ?? undefined,
        salaryRange: candidate.salaryRange,
        salaryPeriod: salaryPeriod && VALID_SALARY_PERIODS.has(salaryPeriod) ? salaryPeriod : null,
        employmentTypes: candidate.employmentTypes,
        jobFunction: candidate.jobFunction,
        incentives: candidate.incentives,
        selectionProcess: candidate.selectionProcess,
        notesHighlights: candidate.notesHighlights,
        applicationDetails,
        category: candidate.isWalkIn ? 'walk-in' : 'job',
        ...(candidate.driveDetails ? { driveDetails: candidate.driveDetails } : {}),
        status: 'PUBLISHED',
    };
}

function sanitizeApplicationDetails(
    value: Record<string, unknown> | null,
): Record<string, unknown> | null {
    if (!value) return null;
    const method = asTrimmedString(value.method)?.toUpperCase() ?? null;
    const platform = asTrimmedString(value.platform);
    const estimatedMinutes = typeof value.estimatedMinutes === 'number'
        && Number.isInteger(value.estimatedMinutes)
        && value.estimatedMinutes > 0
        ? value.estimatedMinutes
        : null;
    const requiredItems = asStringArray(value.requiredItems);

    const result: Record<string, unknown> = {};
    if (method && VALID_APPLICATION_METHODS.has(method)) result.method = method;
    if (platform) result.platform = platform;
    if (estimatedMinutes !== null) result.estimatedMinutes = estimatedMinutes;
    if (requiredItems.length > 0) result.requiredItems = requiredItems;

    return Object.keys(result).length > 0 ? result : null;
}

/** A legacy `processed_jobs` row mapped onto the admin listing contract. */
function processedJobToPayload(row: ProcessedJobCandidate) {
    const type = (row.type || 'JOB').toUpperCase();
    const isWalkIn = type === 'WALKIN';
    const locations = Array.isArray(row.locations)
        ? row.locations.filter((entry) => typeof entry === 'string' && entry.trim().length > 0)
        : [];
    const drive = readDriveFacts(row.walk_in_details);
    const city = locations[0] ?? null;

    const employmentTypes = type === 'INTERNSHIP'
        ? 'INTERNSHIP'
        : asTrimmedString(row.employment_type);

    return buildListingPayload({
        title: (row.title ?? '').trim(),
        company: (row.company ?? '').trim(),
        description: asTrimmedString(row.description),
        applyLink: asHttpUrl(row.apply_link),
        sourceLink: asHttpUrl(row.source_url),
        companyWebsite: asHttpUrl(row.company_website),
        companyLogoUrl: asHttpUrl(row.company_logo_url),
        locations,
        requiredSkills: asStringArray(row.required_skills),
        allowedDegrees: asStringArray(row.allowed_degrees).map((degree) => degree.toUpperCase()),
        allowedCourses: asStringArray(row.allowed_courses),
        allowedSpecializations: asStringArray(row.allowed_specializations),
        allowedPassoutYears: Array.isArray(row.allowed_passout_years)
            ? row.allowed_passout_years.filter((year) => Number.isFinite(year))
            : [],
        workMode: asTrimmedString(row.work_mode),
        experienceMin: row.experience_min,
        experienceMax: row.experience_max,
        salaryRange: asTrimmedString(row.salary_range),
        salaryPeriod: asTrimmedString(row.salary_period),
        employmentTypes,
        jobFunction: asTrimmedString(row.job_function),
        incentives: asTrimmedString(row.incentives),
        selectionProcess: asTrimmedString(row.selection_process),
        notesHighlights: asTrimmedString(row.notes_highlights),
        applicationDetails: Object.keys(parseJsonColumn(row.application_details)).length > 0
            ? parseJsonColumn(row.application_details)
            : null,
        isWalkIn,
        driveDetails: isWalkIn
            ? {
                dates: drive.dates,
                dateRange: drive.dateRange ?? undefined,
                timeRange: drive.timeRange ?? undefined,
                venueAddress: drive.venueAddress ?? undefined,
                reportingTime: drive.reportingTime ?? undefined,
                requiredDocuments: drive.requiredDocuments,
                contactPerson: drive.contactPerson ?? undefined,
                contactPhone: drive.contactPhone ?? undefined,
                city,
            }
            : undefined,
    });
}

/** A legacy `discovered_jobs` row mapped onto the admin listing contract. */
function discoveredJobToPayload(row: DiscoveredJobCandidate) {
    const drive = readDriveFacts(null, {
        dateRange: asTrimmedString(row.walkin_date),
        timeRange: asTrimmedString(row.walkin_time),
        venueAddress: asTrimmedString(row.venue_address),
        reportingTime: asTrimmedString(row.reporting_time),
        contactPerson: asTrimmedString(row.contact_person),
        contactPhone: asTrimmedString(row.contact_phone),
        requiredDocuments: asStringArray(row.required_docs),
        city: asTrimmedString(row.location_city),
        clusterName: asTrimmedString(row.cluster_name),
        latitude: row.latitude,
        longitude: row.longitude,
    });

    // A discovered row only has drive facts when the walk-in collector
    // produced it, so the presence of a venue is the drive signal.
    const isWalkIn = Boolean(row.venue_address || row.walkin_date);
    const locations = [asTrimmedString(row.location_city), asTrimmedString(row.location)]
        .filter((entry): entry is string => Boolean(entry));

    let skills: string[] = [];
    const rawSkills = asTrimmedString(row.skills);
    if (rawSkills) {
        try {
            skills = asStringArray(JSON.parse(rawSkills));
        } catch {
            skills = [];
        }
    }

    return buildListingPayload({
        title: (row.title ?? '').trim(),
        company: (row.company ?? '').trim(),
        description: asTrimmedString(row.description),
        applyLink: asHttpUrl(row.apply_link),
        sourceLink: asHttpUrl(row.source_url),
        companyWebsite: asHttpUrl(row.company_url),
        companyLogoUrl: asHttpUrl(row.company_logo_url),
        locations,
        requiredSkills: skills,
        allowedDegrees: [],
        allowedCourses: [],
        allowedSpecializations: [],
        allowedPassoutYears: [],
        workMode: null,
        experienceMin: row.experience_years,
        experienceMax: row.experience_years,
        salaryRange: row.salary_min
            ? `${row.salary_min}${row.salary_max ? ` - ${row.salary_max}` : ''}`
            : null,
        salaryPeriod: asTrimmedString(row.salary_interval),
        employmentTypes: asTrimmedString(row.employment_type),
        jobFunction: null,
        incentives: null,
        selectionProcess: null,
        notesHighlights: null,
        applicationDetails: null,
        isWalkIn,
        driveDetails: isWalkIn
            ? {
                dates: drive.dates,
                dateRange: drive.dateRange ?? undefined,
                timeRange: drive.timeRange ?? undefined,
                venueAddress: drive.venueAddress ?? undefined,
                reportingTime: drive.reportingTime ?? undefined,
                requiredDocuments: drive.requiredDocuments,
                contactPerson: drive.contactPerson ?? undefined,
                contactPhone: drive.contactPhone ?? undefined,
                city: drive.city ?? undefined,
                clusterName: drive.clusterName ?? undefined,
                latitude: drive.latitude ?? undefined,
                longitude: drive.longitude ?? undefined,
            }
            : undefined,
    });
}

/**
 * Has this listing already been published?
 *
 * Mirrors the duplicate lookup in `listingWrite.ts`: the apply link and the
 * source link are cross-matched in both directions.
 */
async function findExistingListing(applyLink: string, sourceLink: string | null) {
    const filters: Record<string, unknown>[] = [];
    if (applyLink) {
        filters.push({ applyLink });
        filters.push({ sourceLink: applyLink });
    }
    if (sourceLink) {
        filters.push({ sourceLink });
        filters.push({ applyLink: sourceLink });
    }
    if (filters.length === 0) return null;

    return prisma.opportunity.findFirst({
        where: { deletedAt: null, OR: filters },
        select: { id: true, slug: true, status: true },
    });
}

/** Internal signal: a candidate is ready but a human already staged a draft. */
class ListingHeldError extends Error {
    readonly reason: PromoteHoldReason;

    constructor(reason: PromoteHoldReason, message: string) {
        super(message);
        this.name = 'ListingHeldError';
        this.reason = reason;
    }
}

/**
 * Publish one candidate.
 *
 * Returns `'published' | 'already-published'`. A row that a human already
 * staged as a DRAFT is never published automatically — the human's decision
 * to review it outranks this pipeline.
 */
async function publishCandidate(
    payload: Record<string, unknown>,
    applyLink: string,
): Promise<'published' | 'already-published'> {
    let parsed: ExtendedAdminOpportunityData;
    try {
        parsed = opportunitySchema.parse(payload) as unknown as ExtendedAdminOpportunityData;
    } catch (error) {
        throw new ListingHeldError(
            'incomplete-listing',
            `payload rejected by the listing contract: ${error instanceof Error ? error.message : String(error)}`,
        );
    }

    const sourceLink = asTrimmedString(parsed.sourceLink);

    const existing = await findExistingListing(applyLink, sourceLink);
    if (existing) {
        if (existing.status === 'PUBLISHED') return 'already-published';
        throw new ListingHeldError(
            'existing-draft',
            `a draft for this URL already exists (id ${existing.id}) and is awaiting human review`,
        );
    }

    try {
        await createListing(parsed, { status: 'PUBLISHED', onDuplicate: 'reject' });
    } catch (error) {
        if (error instanceof ListingWriteError && error.code === 'CONFLICT') {
            // Another writer published the same URL between the lookup and
            // the write. The end state is the one we wanted.
            return 'already-published';
        }
        throw error;
    }
    return 'published';
}

interface PromoteCandidate {
    source: PromoteSource;
    id: string;
    payload: Record<string, unknown>;
    applyLink: string | null;
    isWalkIn: boolean;
    drive: DriveFacts;
    city: string | null;
    updatedAt: Date | null;
    createdAt: Date | null;
}

/**
 * Run one pass of the promote step.
 *
 * Reads candidates from the legacy ingestion database, applies the gates, and
 * publishes what passes. Safe to run repeatedly: the write path dedupes on
 * `applyLink`.
 */
export async function runPromote(options: PromoteOptions = {}): Promise<PromoteReport> {
    const startedAt = Date.now();
    const limit = Math.min(Math.max(options.limit ?? 200, 1), 2000);
    const maxAgeDays = resolveMaxAgeDays(options.maxAgeDays);
    const dryRun = options.dryRun === true;

    const report: PromoteReport = {
        scanned: 0,
        published: 0,
        alreadyPublished: 0,
        held: 0,
        failed: 0,
        skipped: 0,
        holds: [],
        durationMs: 0,
    };

    if (!hasDb) {
        logger.warn('[promote] No ingestion database configured (INGESTION_DATABASE_URL). Nothing to promote.');
        report.durationMs = Date.now() - startedAt;
        return report;
    }

    const processedRows = await fetchProcessedJobCandidates(limit);
    const discoveredRows = await fetchDiscoveredJobCandidates(limit);

    const candidates: PromoteCandidate[] = [];

    for (const row of processedRows) {
        const payload = processedJobToPayload(row);
        const drive = readDriveFacts(row.walk_in_details);
        const locations = Array.isArray(row.locations) ? row.locations : [];
        candidates.push({
            source: 'processed_jobs',
            id: row.id,
            payload: payload as unknown as Record<string, unknown>,
            applyLink: asTrimmedString(payload.applyLink),
            isWalkIn: (row.type || '').toUpperCase() === 'WALKIN',
            drive,
            city: locations[0] ?? null,
            updatedAt: row.updated_at,
            createdAt: row.created_at,
        });
    }

    for (const row of discoveredRows) {
        const payload = discoveredJobToPayload(row);
        const isWalkIn = Boolean(row.venue_address || row.walkin_date);
        const drive = readDriveFacts(null, {
            dateRange: asTrimmedString(row.walkin_date),
            timeRange: asTrimmedString(row.walkin_time),
            venueAddress: asTrimmedString(row.venue_address),
            reportingTime: asTrimmedString(row.reporting_time),
            contactPerson: asTrimmedString(row.contact_person),
            contactPhone: asTrimmedString(row.contact_phone),
            requiredDocuments: asStringArray(row.required_docs),
        });
        candidates.push({
            source: 'discovered_jobs',
            id: row.id,
            payload: payload as unknown as Record<string, unknown>,
            applyLink: asTrimmedString(payload.applyLink),
            isWalkIn,
            drive,
            city: asTrimmedString(row.location_city) ?? asTrimmedString(row.location),
            updatedAt: row.updated_at,
            createdAt: row.created_at,
        });
    }

    const seenApplyLinks = new Set<string>();

    for (const candidate of candidates) {
        report.scanned += 1;

        const applyLink = asHttpUrl(candidate.applyLink);
        if (!applyLink) {
            report.skipped += 1;
            report.holds.push({
                source: candidate.source,
                id: candidate.id,
                applyLink: null,
                hostname: null,
                reason: 'no-apply-link',
                detail: 'no usable http(s) apply link',
            });
            continue;
        }

        if (seenApplyLinks.has(applyLink)) {
            report.skipped += 1;
            continue;
        }
        seenApplyLinks.add(applyLink);

        const title = asTrimmedString(candidate.payload.title);
        const company = asTrimmedString(candidate.payload.company);
        if (!title || !company) {
            report.skipped += 1;
            report.holds.push({
                source: candidate.source,
                id: candidate.id,
                applyLink,
                hostname: getListingHostname(applyLink),
                reason: 'incomplete-listing',
                detail: 'missing title or company',
            });
            continue;
        }

        // Gate 1 — freshness.
        const stamp = candidate.updatedAt ?? candidate.createdAt;
        if (!isFresh(stamp, maxAgeDays)) {
            report.held += 1;
            report.holds.push({
                source: candidate.source,
                id: candidate.id,
                applyLink,
                hostname: getListingHostname(applyLink),
                reason: 'stale',
                detail: `last seen ${stamp ? new Date(stamp).toISOString() : 'unknown'} (window ${maxAgeDays}d)`,
            });
            continue;
        }

        // Gate 2 — trust.
        if (!isTrustedListingUrl(applyLink)) {
            report.held += 1;
            report.holds.push({
                source: candidate.source,
                id: candidate.id,
                applyLink,
                hostname: getListingHostname(applyLink),
                reason: 'untrusted-host',
                detail: 'apply link is not on a first-party ATS host',
            });
            continue;
        }

        // Gate 3 — drives need real drive facts.
        if (candidate.isWalkIn) {
            const driveReason = checkDriveGate(candidate.drive, candidate.city);
            if (driveReason) {
                report.held += 1;
                report.holds.push({
                    source: candidate.source,
                    id: candidate.id,
                    applyLink,
                    hostname: getListingHostname(applyLink),
                    reason: driveReason,
                    detail: `venue=${candidate.drive.venueAddress ?? 'none'} dates=${candidate.drive.dates.length}`,
                });
                continue;
            }
        }

        if (dryRun) {
            report.published += 1;
            continue;
        }

        try {
            const outcome = await publishCandidate(candidate.payload, applyLink);
            if (outcome === 'already-published') {
                report.alreadyPublished += 1;
            } else {
                report.published += 1;
            }
        } catch (error) {
            if (error instanceof ListingHeldError) {
                report.held += 1;
                report.holds.push({
                    source: candidate.source,
                    id: candidate.id,
                    applyLink,
                    hostname: getListingHostname(applyLink),
                    reason: error.reason,
                    detail: error.message,
                });
                continue;
            }
            report.failed += 1;
            logger.error('[promote] Failed to publish candidate', {
                source: candidate.source,
                id: candidate.id,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    report.durationMs = Date.now() - startedAt;
    logger.info('[promote] Promote cycle complete', {
        scanned: report.scanned,
        published: report.published,
        alreadyPublished: report.alreadyPublished,
        held: report.held,
        failed: report.failed,
        skipped: report.skipped,
        durationMs: report.durationMs,
    });

    return report;
}

async function fetchProcessedJobCandidates(limit: number): Promise<ProcessedJobCandidate[]> {
    const { rows } = await pool.query<ProcessedJobCandidate>(
        `SELECT ${PROCESSED_JOB_COLUMNS}
           FROM processed_jobs
          WHERE status IN ('DRAFT', 'PENDING_REVIEW')
            AND apply_link IS NOT NULL
            AND apply_link <> ''
          ORDER BY GREATEST(updated_at, created_at) DESC NULLS LAST
          LIMIT $1`,
        [limit],
    );
    return rows;
}

async function fetchDiscoveredJobCandidates(limit: number): Promise<DiscoveredJobCandidate[]> {
    const { rows } = await pool.query<DiscoveredJobCandidate>(
        `SELECT ${DISCOVERED_JOB_COLUMNS}
           FROM discovered_jobs d
          WHERE d.status IN ('PENDING', 'APPROVED')
            AND d.apply_link IS NOT NULL
            AND d.apply_link <> ''
            AND NOT EXISTS (
                SELECT 1 FROM processed_jobs p WHERE p.discovered_job_id = d.id
            )
          ORDER BY GREATEST(d.updated_at, d.created_at) DESC NULLS LAST
          LIMIT $1`,
        [limit],
    );
    return rows;
}
