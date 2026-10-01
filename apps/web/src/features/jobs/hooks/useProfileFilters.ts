'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Opportunity, Profile } from '@fresherflow/types';
import { matchesDeclaredPassoutYear } from '@/features/jobs/domain/passoutYears';
import { formatWorkMode } from '@/features/profile/preferences';

/**
 * Profile preferences as FIRST-CLASS, VISIBLE feed filters.
 *
 * The feed has always narrowed itself from the signed-in profile — preferred
 * cities, work modes, batch year — with nothing on screen saying so. This
 * module is the single home for that conversion:
 *
 *  - `deriveProfileFilterChips` turns profile preferences into chips,
 *  - `useProfileFilterPrefs` remembers which chips (or the whole set) the
 *    user switched off, in localStorage,
 *  - `matchesProfileFilters` answers "does this job pass the profile chips?".
 *
 * Semantics mirror the server's preference filter: OR inside a dimension
 * (any preferred city counts), AND across dimensions, and an opportunity
 * that carries no data for a dimension passes it — a listing with no
 * locations set is never dropped by a city chip.
 */

export type ProfileFilterDim = 'city' | 'workMode' | 'batch';

export interface ProfileFilterChip {
    /** Stable identity for dismissal: `city:Mumbai`. */
    id: string;
    dim: ProfileFilterDim;
    value: string;
    label: string;
}

export interface ProfileFilterPrefs {
    /** Master switch — the whole personalization layer. */
    enabled: boolean;
    /** Chip ids the user individually removed. */
    dismissed: string[];
}

const STORAGE_KEY = 'ff:profileFilters';
const DEFAULT_PREFS: ProfileFilterPrefs = { enabled: true, dismissed: [] };

// ─── Persisted prefs (localStorage-backed, subscribe-able) ───────────────────

const listeners = new Set<() => void>();
let cachedPrefs: ProfileFilterPrefs | null = null;

function normalizePrefs(raw: unknown): ProfileFilterPrefs {
    const parsed = raw as { enabled?: unknown; dismissed?: unknown } | null;
    return {
        enabled: parsed?.enabled !== false,
        dismissed: Array.isArray(parsed?.dismissed)
            ? parsed.dismissed.filter((entry): entry is string => typeof entry === 'string')
            : [],
    };
}

export function readProfileFilterPrefs(): ProfileFilterPrefs {
    if (typeof window === 'undefined') return DEFAULT_PREFS;
    if (cachedPrefs) return cachedPrefs;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        cachedPrefs = raw ? normalizePrefs(JSON.parse(raw)) : { ...DEFAULT_PREFS, dismissed: [] };
    } catch {
        cachedPrefs = { ...DEFAULT_PREFS, dismissed: [] };
    }
    return cachedPrefs;
}

function writeProfileFilterPrefs(next: ProfileFilterPrefs) {
    cachedPrefs = next;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
        // Private mode / quota — the in-memory value still applies this session.
    }
    listeners.forEach((listener) => listener());
}

export function subscribeProfileFilterPrefs(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

/**
 * Lazy-reads localStorage so the stored switch position applies on the FIRST
 * client render — a reload never paints the feed one way and then flips it.
 * Every later change arrives through the store subscription.
 */
export function useProfileFilterPrefs() {
    const [prefs, setPrefs] = useState<ProfileFilterPrefs>(readProfileFilterPrefs);

    useEffect(() => subscribeProfileFilterPrefs(() => setPrefs(readProfileFilterPrefs())), []);

    const setEnabled = useCallback((enabled: boolean) => {
        writeProfileFilterPrefs({ ...readProfileFilterPrefs(), enabled });
    }, []);

    /** Turn one chip off (or back on). */
    const toggleChip = useCallback((id: string) => {
        const current = readProfileFilterPrefs();
        const dismissed = current.dismissed.includes(id)
            ? current.dismissed.filter((entry) => entry !== id)
            : [...current.dismissed, id];
        writeProfileFilterPrefs({ ...current, dismissed });
    }, []);

    return { prefs, setEnabled, toggleChip };
}

// ─── Profile → chips ─────────────────────────────────────────────────────────

export function deriveProfileFilterChips(profile: Profile | null | undefined): ProfileFilterChip[] {
    if (!profile) return [];

    const chips: ProfileFilterChip[] = [];

    for (const city of profile.preferredCities ?? []) {
        const value = city.trim();
        if (value) {
            chips.push({ id: `city:${value.toLowerCase()}`, dim: 'city', value, label: value });
        }
    }

    for (const mode of profile.workModes ?? []) {
        const value = String(mode).toUpperCase();
        if (value) {
            chips.push({
                id: `workMode:${value}`,
                dim: 'workMode',
                value,
                label: formatWorkMode(value),
            });
        }
    }

    const batch = profile.pgYear || profile.gradYear;
    if (batch) {
        chips.push({ id: `batch:${batch}`, dim: 'batch', value: String(batch), label: `${batch} Batch` });
    }

    return chips;
}

/** Dismissal id for a whole dimension (`dim:city`), used by URL seeding. */
export function profileDimId(dim: ProfileFilterDim): string {
    return `dim:${dim}`;
}

/** Chips that are switched on right now: master switch respected, per-chip and
 * per-dimension dismissals removed. */
export function getActiveProfileChips(
    profile: Profile | null | undefined,
    prefs: ProfileFilterPrefs,
): ProfileFilterChip[] {
    if (!prefs.enabled) return [];
    const dismissed = new Set(prefs.dismissed);
    return deriveProfileFilterChips(profile).filter(
        (chip) => !dismissed.has(chip.id) && !dismissed.has(profileDimId(chip.dim)),
    );
}

/**
 * The profile preferences as URL-shaped filter values. `useCategoryPageState`
 * writes these into the query string, which is what makes them show up as
 * ordinary, removable chips — the URL stays the single source of truth.
 */
export interface ProfileFilterSeed {
    /** Comma-joined, matching `?location=` — the matcher splits on commas. */
    location?: string;
    year?: number;
    workMode?: string[];
}

export function buildProfileFilterSeed(
    profile: Profile | null | undefined,
): ProfileFilterSeed {
    if (!profile) return {};
    const seed: ProfileFilterSeed = {};

    const cities = (profile.preferredCities ?? []).map((city) => city.trim()).filter(Boolean);
    if (cities.length > 0) seed.location = cities.join(',');

    const modes = (profile.workModes ?? []).map((mode) => String(mode).toUpperCase()).filter(Boolean);
    if (modes.length > 0) seed.workMode = modes;

    const batch = profile.pgYear || profile.gradYear;
    if (batch) seed.year = batch;

    return seed;
}

/** Remove whole dimensions from the profile layer (X on a seeded chip). */
export function dismissProfileFilterDims(dims: ProfileFilterDim[]) {
    const current = readProfileFilterPrefs();
    const ids = dims.map(profileDimId);
    const dismissed = current.dismissed.filter((id) => !ids.includes(id));
    ids.forEach((id) => dismissed.push(id));
    writeProfileFilterPrefs({ ...current, dismissed });
}

/** Re-enabling the master switch starts the profile layer fresh, so a
 * dimension removed earlier can always come back. */
export function resetProfileFilterDims() {
    const current = readProfileFilterPrefs();
    const dismissed = current.dismissed.filter((id) => !id.startsWith('dim:'));
    if (dismissed.length !== current.dismissed.length) {
        writeProfileFilterPrefs({ ...current, dismissed });
    }
}

// ─── Matching ────────────────────────────────────────────────────────────────

function workModeOf(opportunity: Opportunity): string {
    return String((opportunity as unknown as { workMode?: string | null }).workMode ?? '').toUpperCase();
}

export function matchesProfileFilters(opportunity: Opportunity, chips: ProfileFilterChip[]): boolean {
    if (chips.length === 0) return true;

    const cities = chips.filter((chip) => chip.dim === 'city').map((chip) => chip.value.toLowerCase());
    if (cities.length > 0) {
        const locations = (opportunity.locations ?? []).map((loc) => loc.toLowerCase().trim()).filter(Boolean);
        const mode = workModeOf(opportunity);
        const isRemote =
            mode === 'REMOTE' ||
            locations.some((loc) => loc.includes('remote') || loc.includes('wfh') || loc.includes('work from home'));
        // No location data, or a remote role: a city preference never drops it.
        if (locations.length > 0 && !isRemote) {
            const hit = locations.some((loc) => cities.some((city) => loc.includes(city) || city.includes(loc)));
            if (!hit) return false;
        }
    }

    const modes = chips.filter((chip) => chip.dim === 'workMode').map((chip) => chip.value);
    if (modes.length > 0) {
        const mode = workModeOf(opportunity);
        if (mode && !modes.includes(mode)) return false;
    }

    const batchChip = chips.find((chip) => chip.dim === 'batch');
    if (batchChip && !matchesDeclaredPassoutYear(opportunity, Number(batchChip.value))) {
        // The same rule the feed filter applies, so a listing can never be
        // visible in the feed and simultaneously flagged as a profile mismatch.
        return false;
    }

    return true;
}
