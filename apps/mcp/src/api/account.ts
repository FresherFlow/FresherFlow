import { apiFetch } from '../http/client.js';

/**
 * The signed-in candidate's own data: profile, bookmarks, applications.
 *
 * Every call is scoped by the caller's token on the API side, so nothing here
 * takes a user id. The module deliberately narrows what the API returns:
 * `GET /api/profile` carries date of birth, gender and reservation category for
 * government eligibility, and none of that belongs in a tool result the model
 * repeats back (OpenAI review rejects unnecessary personal data).
 */

// ─── profile ─────────────────────────────────────────────────────────────────

/** The profile fields a job search actually needs. No identity or demographic data. */
export type MyProfile = {
    completionPercentage: number;
    educationLevel: string | null;
    gradCourse: string | null;
    gradSpecialization: string | null;
    gradYear: number | null;
    pgCourse: string | null;
    pgSpecialization: string | null;
    pgYear: number | null;
    tenthYear: number | null;
    twelfthYear: number | null;
    interestedIn: string[];
    preferredCities: string[];
    workModes: string[];
    availability: string | null;
    skills: string[];
    headline: string | null;
    resumeUrl: string | null;
    willingToRelocate: boolean | null;
};

type RawProfile = Record<string, unknown> & { completionPercentage?: unknown };

function text(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value : null;
}

function number(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function textList(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function toMyProfile(profile: RawProfile): MyProfile {
    return {
        completionPercentage: number(profile.completionPercentage) ?? 0,
        educationLevel: text(profile.educationLevel),
        gradCourse: text(profile.gradCourse),
        gradSpecialization: text(profile.gradSpecialization),
        gradYear: number(profile.gradYear),
        pgCourse: text(profile.pgCourse),
        pgSpecialization: text(profile.pgSpecialization),
        pgYear: number(profile.pgYear),
        tenthYear: number(profile.tenthYear),
        twelfthYear: number(profile.twelfthYear),
        interestedIn: textList(profile.interestedIn),
        preferredCities: textList(profile.preferredCities),
        workModes: textList(profile.workModes),
        availability: text(profile.availability),
        skills: textList(profile.skills),
        headline: text(profile.headline),
        resumeUrl: text(profile.resumeUrl),
        willingToRelocate: typeof profile.willingToRelocate === 'boolean' ? profile.willingToRelocate : null,
    };
}

/** The caller's profile, or null when the account has not created one yet. */
export async function getMyProfile(): Promise<MyProfile | null> {
    const data = await apiFetch<{ profile?: RawProfile | null }>('/api/profile');
    return data.profile ? toMyProfile(data.profile) : null;
}

// ─── saved jobs ──────────────────────────────────────────────────────────────

export type SavedJob = {
    id: string;
    slug: string | null;
    title: string;
    company: string;
    locations: string[];
    employmentTypes: string[];
    workMode: string | null;
    expiresAt: string | null;
    applyLink: string | null;
    url: string | null;
};

type RawOpportunity = Record<string, unknown>;

function toSavedJob(row: RawOpportunity, siteUrl: string): SavedJob {
    const slug = text(row.slug);
    return {
        id: String(row.id ?? ''),
        slug,
        title: text(row.title) ?? '',
        company: text(row.company) ?? '',
        locations: textList(row.locations),
        employmentTypes: textList(row.employmentTypes),
        workMode: text(row.workMode),
        expiresAt: text(row.expiresAt),
        applyLink: text(row.applyLink),
        url: slug ? `${siteUrl}/jobs/${encodeURIComponent(slug)}` : null,
    };
}

/** Bookmarked listings, newest save first. The API caps a page at 50. */
export async function listSavedJobs(siteUrl: string): Promise<{ jobs: SavedJob[]; total: number; truncated: boolean }> {
    const data = await apiFetch<{
        opportunities?: unknown;
        total?: unknown;
        hasMore?: unknown;
    }>('/api/saved?limit=50');
    const rows = Array.isArray(data.opportunities) ? data.opportunities as RawOpportunity[] : [];
    const total = typeof data.total === 'number' ? data.total : rows.length;
    return {
        jobs: rows.map((row) => toSavedJob(row, siteUrl)),
        total,
        truncated: data.hasMore === true,
    };
}

/**
 * Put a bookmark in the requested state.
 *
 * `POST /api/saved/:id` is a toggle with no "set" variant and no single-item
 * read, so the first call may land on the opposite state when the user asks for
 * the one it was already in. In that case one more toggle is the correct
 * correction, and the second response is the state we report. Two calls bound
 * the work; a third would mean the API is not behaving and must be surfaced.
 */
export async function setJobSaved(
    identifier: string,
    saved: boolean,
): Promise<{ saved: boolean; corrected: boolean }> {
    const toggle = () => apiFetch<{ saved?: unknown }>(
        `/api/saved/${encodeURIComponent(identifier)}`,
        { method: 'POST' },
    );

    const first = await toggle();
    if (typeof first.saved !== 'boolean') {
        throw new Error('FresherFlow did not confirm the bookmark state. Try again.');
    }
    if (first.saved === saved) return { saved, corrected: false };

    const second = await toggle();
    if (typeof second.saved !== 'boolean' || second.saved !== saved) {
        throw new Error('FresherFlow could not confirm the bookmark state. Try again.');
    }
    return { saved, corrected: true };
}

// ─── applications ────────────────────────────────────────────────────────────

export type ApplicationStage =
    | 'APPLIED' | 'REGISTERED' | 'IN_REVIEW' | 'ASSESSMENT' | 'INTERVIEW'
    | 'OFFERED' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN' | 'SKIPPED' | 'PARTICIPATED';

export type MyApplication = {
    id: string;
    stage: string;
    appliedAt: string | null;
    updatedAt: string | null;
    opportunity: {
        id: string;
        slug: string | null;
        title: string;
        company: string;
        locations: string[];
        expiresAt: string | null;
        url: string | null;
    } | null;
};

type RawApplication = Record<string, unknown> & { opportunity?: RawOpportunity | null };

function toApplication(row: RawApplication, siteUrl: string): MyApplication {
    const opportunity = row.opportunity ?? null;
    const slug = opportunity ? text(opportunity.slug) : null;
    return {
        id: String(row.id ?? ''),
        stage: text(row.stage) ?? 'APPLIED',
        appliedAt: text(row.appliedAt),
        updatedAt: text(row.updatedAt),
        opportunity: opportunity
            ? {
                id: String(opportunity.id ?? ''),
                slug,
                title: text(opportunity.title) ?? '',
                company: text(opportunity.company) ?? '',
                locations: textList(opportunity.locations),
                expiresAt: text(opportunity.expiresAt),
                url: slug ? `${siteUrl}/jobs/${encodeURIComponent(slug)}` : null,
            }
            : null,
    };
}

/** The caller's own application records, newest first. */
export async function listMyApplications(
    siteUrl: string,
    options: { stage?: ApplicationStage; limit?: number } = {},
): Promise<{ applications: MyApplication[]; total: number; page: number; hasMore: boolean }> {
    const params = new URLSearchParams();
    if (options.stage) params.set('stage', options.stage);
    if (options.limit) params.set('limit', String(options.limit));
    const query = params.size ? `?${params.toString()}` : '';

    const data = await apiFetch<{
        data?: unknown;
        pagination?: { page?: unknown; pages?: unknown; total?: unknown };
    }>(`/api/applications/me${query}`);
    const rows = Array.isArray(data.data) ? data.data as RawApplication[] : [];
    const pagination = data.pagination ?? {};
    const page = typeof pagination.page === 'number' ? pagination.page : 1;
    const pages = typeof pagination.pages === 'number' ? pagination.pages : 1;
    const total = typeof pagination.total === 'number' ? pagination.total : rows.length;
    return {
        applications: rows.map((row) => toApplication(row, siteUrl)),
        total,
        page,
        hasMore: page < pages,
    };
}
