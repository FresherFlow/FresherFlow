'use client';

import * as React from 'react';

/**
 * Nav listing links → the count field they represent in /api/public/nav-counts.
 * Only links that back a real feed filter get a number.
 */
const HREF_TO_COUNT: Record<string, string> = {
    '/jobs': 'opportunities',
    '/jobs?tab=for-you': 'opportunities',
    '/jobs?type=internship': 'internships',
    '/jobs?mode=remote': 'remote',
    '/drives': 'walkins',
    '/drives/off-campus': 'walkins',
    '/drives/walk-in': 'walkins',
    '/govt': 'government',
    '/companies': 'companies',
};

/**
 * Government sub-category links → label in the `govtCategories` map.
 * Keys are byte-identical to `REGISTRY` hrefs (State PSC is percent-encoded
 * there, so it must be encoded here too for the badge lookup to hit).
 */
const GOVT_HREF_TO_LABEL: Record<string, string> = {
    '/govt?category=UPSC': 'UPSC',
    '/govt?category=SSC': 'SSC',
    '/govt?category=Banking': 'Banking',
    '/govt?category=Railways': 'Railways',
    '/govt?category=State%20PSC': 'State PSC',
    '/govt?category=Defence': 'Defence',
    '/govt?category=Teaching': 'Teaching',
    '/govt?category=Police': 'Police',
    '/govt?category=Engineering': 'Engineering',
};

interface NavCountsResponse {
    opportunities?: number;
    internships?: number;
    remote?: number;
    walkins?: number;
    government?: number;
    companies?: number;
    govtCategories?: Record<string, number>;
}

function toBadges(data: NavCountsResponse | null): Record<string, number> {
    const badges: Record<string, number> = {};
    if (!data) return badges;

    for (const [href, key] of Object.entries(HREF_TO_COUNT)) {
        const value = data[key as keyof NavCountsResponse];
        if (typeof value === 'number' && value > 0) badges[href] = value;
    }

    const govt = data.govtCategories;
    if (govt) {
        for (const [href, label] of Object.entries(GOVT_HREF_TO_LABEL)) {
            const value = govt[label];
            if (typeof value === 'number' && value > 0) badges[href] = value;
        }
    }

    return badges;
}

/**
 * Live feed counts for sidebar nav badges.
 *
 * One request per session: the mapped result is cached at module level and
 * shared by every mount (the rail, the mobile drawer), so switching spaces or
 * remounting the shell never refetches. Returns null until the first response
 * lands, so badges omit rather than flash a placeholder.
 */
/** Counts stay fresh for 5 minutes, then re-pull when the tab becomes visible. */
const COUNTS_TTL_MS = 5 * 60 * 1000;

let cachedBadges: Record<string, number> | null = null;
let cachedAt = 0;
let inflight: Promise<Record<string, number>> | null = null;

function loadCounts(): Promise<Record<string, number>> {
    if (cachedBadges !== null && Date.now() - cachedAt < COUNTS_TTL_MS) {
        return Promise.resolve(cachedBadges);
    }
    if (inflight) return inflight;

    inflight = fetch('/api/public/nav-counts')
        .then((res) => (res.ok ? res.json() : null))
        .then((data: NavCountsResponse | null) => {
            // A failed refresh keeps the last good numbers instead of flickering
            // badges back to nothing.
            const mapped = data ? toBadges(data) : (cachedBadges ?? {});
            cachedBadges = mapped;
            cachedAt = Date.now();
            return mapped;
        })
        .catch(() => {
            cachedAt = Date.now();
            return cachedBadges ?? {};
        })
        .finally(() => {
            inflight = null;
        });

    return inflight;
}

export function useNavCounts(): Record<string, number> | null {
    const [badges, setBadges] = React.useState<Record<string, number> | null>(cachedBadges);

    React.useEffect(() => {
        let cancelled = false;
        const apply = (mapped: Record<string, number>) => {
            if (!cancelled) setBadges(mapped);
        };

        void loadCounts().then(apply);

        // Re-pull only once stale, so a job publish surfaces without a reload.
        const onVisible = () => {
            if (document.visibilityState !== 'visible') return;
            if (Date.now() - cachedAt < COUNTS_TTL_MS) return;
            void loadCounts().then(apply);
        };
        document.addEventListener('visibilitychange', onVisible);

        return () => {
            cancelled = true;
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, []);

    return badges;
}
