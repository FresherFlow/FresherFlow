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

export function getGroupedLocations(locations?: string[] | null): string[] {
    const rawTokens = (locations ?? [])
        .flatMap(l => l.split(','))
        .map(l => l.trim())
        .filter(l => l.toLowerCase() !== 'india' && l !== '');
    
    if (rawTokens.length === 0) return [];
    
    const toTitleCaseLocal = (value: string): string =>
        value
            .split(' ')
            .filter(Boolean)
            .map((part) => part[0]?.toUpperCase() + part.slice(1).toLowerCase())
            .join(' ');
            
    const lowerTokens = rawTokens.map(t => t.toLowerCase());

    const REMOTE_ALIASES_LOCAL = new Set(['remote', 'work from home', 'wfh', 'pan india', 'anywhere']);
    if (lowerTokens.some(t => REMOTE_ALIASES_LOCAL.has(t))) {
        return ['Remote'];
    }

    const cities = new Set<string>();
    const states = new Set<string>();

    rawTokens.forEach(token => {
        const lower = token.toLowerCase();
        if (isStateName(lower)) {
            states.add(toTitleCaseLocal(token));
        } else {
            cities.add(toTitleCaseLocal(token));
        }
    });

    const uniqueCities = Array.from(cities);

    if (uniqueCities.length === 1) {
        const city = uniqueCities[0];
        const lowerCity = city.toLowerCase();
        const state = Array.from(states)[0] || getStateForCity(lowerCity);
        if (state) {
            return [`${city}, ${toTitleCaseLocal(state)}`];
        }
        return [city];
    } else if (uniqueCities.length > 1) {
        // If multiple cities, hide the state entirely!
        return uniqueCities;
    } else {
        // Only states or other tokens
        return Array.from(states);
    }
}
