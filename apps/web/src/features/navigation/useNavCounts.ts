'use client';

import * as React from 'react';

/**
 * Nav listing links → the count field they represent in /api/public/nav-counts.
 * Only links that back a real feed filter get a number.
 */
const HREF_TO_COUNT: Record<string, string> = {
    '/jobs': 'opportunities',
    '/jobs?type=internship': 'internships',
    '/jobs?mode=remote': 'remote',
    '/jobs/walkins': 'walkins',
    '/govt': 'government',
    '/companies': 'companies',
};

/**
 * Live feed counts for sidebar nav badges.
 *
 * One request per session: the mapped result is cached at module level and
 * shared by every mount (the rail, the mobile drawer), so switching spaces or
 * remounting the shell never refetches. Returns null until the first response
 * lands, so badges omit rather than flash a placeholder.
 */
let cachedBadges: Record<string, number> | null = null;
let inflight: Promise<Record<string, number>> | null = null;

export function useNavCounts(): Record<string, number> | null {
    const [badges, setBadges] = React.useState<Record<string, number> | null>(cachedBadges);

    React.useEffect(() => {
        if (cachedBadges !== null) {
            setBadges(cachedBadges);
            return;
        }

        let cancelled = false;

        if (!inflight) {
            inflight = fetch('/api/public/nav-counts')
                .then((res) => (res.ok ? res.json() : null))
                .then((data: Record<string, number> | null) => {
                    const mapped: Record<string, number> = {};