/**
 * Live Search API — calls the concurrent fan-out search via Next.js API proxy.
 *
 * Mirrors ever-jobs POST /api/jobs/search:
 * - searchTerm, location, hoursOld, companySlug, siteType
 * - Returns merged results from all scrapers running concurrently
 */

export interface LiveSearchInput {
    searchTerm?: string;
    location?: string;
    hoursOld?: number;
    companySlug?: string;
    siteType?: string[];
    resultsWanted?: number;
}

export interface LiveSearchResult {
    count: number;
    jobs: LiveSearchJob[];
    rawCount: number;
    siteBreakdown?: Record<string, number>;
    errors?: Array<{ site: string; error: string }>;
    durationMs: number;
    cached?: boolean;
}

export interface LiveSearchJob {
    id?: string | null;
    title: string;
    companyName?: string | null;
    jobUrl?: string | null;
    location?: { country?: string; city?: string; state?: string; raw?: string } | null;
    description?: string | null;
    compensation?: { interval?: string; minAmount?: number; maxAmount?: number; currency?: string } | null;
    datePosted?: string | null;
    isRemote?: boolean;
    workFromHomeType?: string | null;
    employmentType?: string | null;
    emails?: string[];
    site?: string;
    atsType?: string;
    atsId?: string;
    department?: string | null;
    [key: string]: unknown;
}

/**
 * Search for jobs across all registered scrapers concurrently.
 */
export async function liveSearch(input: LiveSearchInput): Promise<LiveSearchResult> {
    const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Search failed' }));
        throw new Error(errorData.error || `Search failed (${res.status})`);
    }

    return res.json();
}

/**
 * Convert a LiveSearchJob to the Opportunity type used by the feed UI.
 * Maps between the ingestion plugin output format and the web app's Opportunity model.
 */
export function liveJobToOpportunity(job: LiveSearchJob): Record<string, unknown> {
    const locationRaw = typeof job.location === 'object' && job.location
        ? job.location.raw || [job.location.city, job.location.state, job.location.country].filter(Boolean).join(', ')
        : typeof job.location === 'string'
            ? job.location
            : '';

    return {
        id: `live-${job.atsType}-${job.atsId || job.id || Date.now()}`,
        slug: `live-${job.atsType}-${job.atsId || job.id || Date.now()}`,
        title: job.title || 'Untitled',
        company: job.companyName || 'Unknown',
        companyLogo: null,
        locations: locationRaw ? [locationRaw] : [],
        type: 'JOB',
        description: job.description || '',
        salaryMin: job.compensation?.minAmount ?? undefined,
        salaryMax: job.compensation?.maxAmount ?? undefined,
        currency: job.compensation?.currency ?? 'INR',
        applyLink: job.jobUrl || '',
        postedAt: job.datePosted || undefined,
        expiresAt: undefined,
        requiredSkills: [],
        source: `ATS_${(job.atsType || 'unknown').toUpperCase()}`,
        isRemote: job.isRemote ?? false,
        workMode: job.workFromHomeType || undefined,
        employmentType: job.employmentType || undefined,
        // Preserve raw plugin data for display
        _liveSearch: true,
        _site: job.site,
        _atsType: job.atsType,
    } as Record<string, unknown>;
}
