import { getStateForCity, isStateName } from '@fresherflow/utils';

const INDIA_ALIASES = new Set(['india', 'bharat']);
const REMOTE_ALIASES = new Set([
    'remote',
    'work from home',
    'wfh',
    'pan india',
    'anywhere',
]);

export interface ParsedOpportunityLocation {
    shortLabel: string;
    fullLabel: string;
    city?: string;
    state?: string;
    country?: string;
    cities: string[];
    isRemote: boolean;
}

const toTitleCase = (value: string): string =>
    value
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0]?.toUpperCase() + part.slice(1))
        .join(' ');

const splitLocationTokens = (locations: string[]): string[] => {
    const tokens = locations
        .flatMap((value) => value.split(','))
        .map((token) => token.trim())
        .filter(Boolean);

    return Array.from(new Set(tokens));
};

export const parseOpportunityLocation = (locations?: string[] | null): ParsedOpportunityLocation => {
    const source = Array.isArray(locations) ? locations.filter(Boolean) : [];
    if (source.length === 0) {
        return {
            shortLabel: 'Remote',
            fullLabel: 'Remote',
            country: 'India',
            cities: [],
            isRemote: true,
        };
    }

    const rawTokens = splitLocationTokens(source);
    const normalizedTokens = rawTokens.map((token) => token.toLowerCase());

    if (normalizedTokens.some((token) => REMOTE_ALIASES.has(token))) {
        return {
            shortLabel: 'Remote',
            fullLabel: 'Remote',
            country: 'India',
            cities: [],
            isRemote: true,
        };
    }

    let country: string | undefined;
    let state: string | undefined;
    const cities: string[] = [];

    rawTokens.forEach((token) => {
        const normalized = token.toLowerCase();
        if (INDIA_ALIASES.has(normalized)) {
            country = 'India';
            return;
        }

        if (isStateName(normalized)) {
            state = toTitleCase(token);
            return;
        }

        const mappedState = getStateForCity(normalized);
        if (mappedState) {
            cities.push(toTitleCase(token));
            if (!state) state = mappedState;
            return;
        }

        cities.push(toTitleCase(token));
    });

    const dedupedCities = Array.from(new Set(cities));
    const primaryCity = dedupedCities[0];
    const cityLabel = dedupedCities.length > 0
        ? dedupedCities.join(', ')
        : undefined;

    let shortLabel = 'Remote';
    if (cityLabel) {
        if (dedupedCities.length === 1) {
            shortLabel = state ? `${primaryCity}, ${state}` : primaryCity;
        } else if (dedupedCities.length === 2) {
            shortLabel = dedupedCities.join(', ');
        } else {
            shortLabel = `${primaryCity} +${dedupedCities.length - 1}`;
        }
    } else {
        shortLabel = state || country || rawTokens[0] || 'Remote';
    }

    return {
        shortLabel,
        fullLabel: cityLabel ? [cityLabel, state, country].filter(Boolean).join(', ') : (state || country || 'Remote'),
        city: primaryCity,
        state,
        country: country || 'India',
        cities: dedupedCities,
        isRemote: false,
    };
};

/**
 * The location chips a detail page renders, each a `City, State` run.
 *
 * Shares the token rules with `parseOpportunityLocation` above. It used to
 * re-declare both the remote-alias set and its own title-caser — and the local
 * title-caser lower-cased the tail of every word, so the same listing read
 * `New Mumbai` in the chips and `NEW mumbai` in the hero.
 */
export function getGroupedLocations(locations?: string[] | null): string[] {
    const rawTokens = (locations ?? [])
        .flatMap((value) => value.split(','))
        .map((token) => token.trim())
        .filter((token) => token && !INDIA_ALIASES.has(token.toLowerCase()));

    if (rawTokens.length === 0) return [];

    if (rawTokens.some((token) => REMOTE_ALIASES.has(token.toLowerCase()))) {
        return ['Remote'];
    }

    const cities = new Set<string>();
    const states = new Set<string>();

    rawTokens.forEach((token) => {
        const target = isStateName(token.toLowerCase()) ? states : cities;
        target.add(toTitleCase(token));
    });

    const uniqueCities = Array.from(cities);

    if (uniqueCities.length === 1) {
        const city = uniqueCities[0];
        const state = Array.from(states)[0] || getStateForCity(city.toLowerCase());
        return state ? [`${city}, ${state}`] : [city];
    }

    if (uniqueCities.length > 1) {
        // Several cities: a single state would misdescribe the rest, so hide it.
        return uniqueCities;
    }

    // Only states, or tokens we could not place.
    return Array.from(states);
}
