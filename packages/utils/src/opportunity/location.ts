/**
 * Location display normalization shared by every surface that renders a
 * listing's locations (social captions, admin share packs, alerts, cards,
 * SEO labels).
 *
 * Source data is messy. The same job can arrive as
 *   ["Bengaluru, Karnataka, India", "Bengaluru"]
 * or as a legacy split
 *   ["Bengaluru", "Karnataka", "India"]
 * and a country is often repeated on every entry.
 *
 * This module collapses a label that is already contained in a fuller one,
 * folds a split state/country back into its city, canonicalises names through
 * the `country-state-city` dataset (re-exported by `@fresherflow/constants`),
 * and drops a country when every location shares it.
 *
 * No city, state or country name is written in this file. Every name comes
 * from the dataset.
 */
import { City, Country, State } from '@fresherflow/constants';

export interface LocationLabel {
    /** Ready-to-render label, e.g. "Bengaluru, Karnataka". */
    label: string;
    /** The source string this label came from. */
    raw: string;
    city?: string;
    state?: string;
    country?: string;
    isRemote: boolean;
}

export interface LocationTextOptions {
    /** Maximum number of labels to render. Defaults to 2. */
    max?: number;
    /** Separator between labels. Defaults to " / ". */
    separator?: string;
    /** Suffix when labels were omitted. Defaults to " +". */
    moreSuffix?: string;
}

type CountryRecord = { name: string; isoCode: string };
type CityRecord = { name: string; stateCode: string };

const REMOTE_VALUES = new Set(['remote', 'work from home', 'wfh', 'anywhere']);

/** Every country, keyed by lowercase name and ISO code. */
const COUNTRY_BY_KEY = new Map<string, CountryRecord>();
for (const country of Country.getAllCountries()) {
    const record: CountryRecord = { name: country.name, isoCode: country.isoCode };
    COUNTRY_BY_KEY.set(locationKey(country.name), record);
    COUNTRY_BY_KEY.set(locationKey(country.isoCode), record);
}

/** Per-country state and city indexes, built lazily and cached. */
const STATE_INDEX_BY_COUNTRY = new Map<string, Map<string, string>>();
const CITY_INDEX_BY_COUNTRY = new Map<string, Map<string, CityRecord>>();

interface ParsedLocation {
    raw: string;
    parts: string[];
    city?: string;
    state?: string;
    country?: CountryRecord;
}

/** Case/diacritic/punctuation-insensitive key used for comparison. */
function locationKey(value: string): string {
    return value
        .normalize('NFKD')
        .replace(/\p{M}/gu, '')
        .replace(/[.,;:'"()[\]{}]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

function stateIndex(countryCode: string): Map<string, string> {
    const cached = STATE_INDEX_BY_COUNTRY.get(countryCode);
    if (cached) return cached;

    const index = new Map<string, string>();
    for (const state of State.getStatesOfCountry(countryCode) ?? []) {
        index.set(locationKey(state.name), state.name);
        index.set(locationKey(state.isoCode), state.name);
    }
    STATE_INDEX_BY_COUNTRY.set(countryCode, index);
    return index;
}

function cityIndex(countryCode: string): Map<string, CityRecord> {
    const cached = CITY_INDEX_BY_COUNTRY.get(countryCode);
    if (cached) return cached;

    const index = new Map<string, CityRecord>();
    for (const city of City.getCitiesOfCountry(countryCode) ?? []) {
        index.set(locationKey(city.name), { name: city.name, stateCode: city.stateCode });
    }
    CITY_INDEX_BY_COUNTRY.set(countryCode, index);
    return index;
}

/** Split one array entry that may hold several locations. */
function splitRawLocations(locations?: string[] | null): string[] {
    const result: string[] = [];
    for (const value of locations ?? []) {
        if (typeof value !== 'string') continue;
        for (const segment of value.split(/[;|]/)) {
            const trimmed = segment.replace(/\s+/g, ' ').trim();
            if (trimmed) result.push(trimmed);
        }
    }
    return result;
}

/**
 * Parse a single label into its parts. `contextCountry` is the country already
 * detected elsewhere in the same set; a bare city can borrow it when the
 * dataset confirms the city belongs there.
 */
function parseLocation(raw: string, contextCountry?: CountryRecord): ParsedLocation | null {
    const split = raw
        .split(',')
        .map((part) => part.replace(/\s+/g, ' ').trim())
        .filter(Boolean);
    if (split.length === 0) return null;

    // Drop repeated parts ("Bengaluru, Karnataka, Karnataka").
    const parts: string[] = [];
    const seen = new Set<string>();
    for (const part of split) {
        const key = locationKey(part);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        parts.push(part);
    }
    if (parts.length === 0) return null;

    // A country is normally last; a few feeds prefix it instead.
    // A standalone entry can also be nothing but a country (a legacy split row
    // ships one part per token), so a single part is checked as well.
    let country: CountryRecord | undefined;
    const lastPartCountry = COUNTRY_BY_KEY.get(locationKey(parts[parts.length - 1]));
    if (lastPartCountry) {
        country = lastPartCountry;
        parts.pop();
    } else if (parts.length > 1) {
        const firstPartCountry = COUNTRY_BY_KEY.get(locationKey(parts[0]));
        if (firstPartCountry) {
            country = firstPartCountry;
            parts.shift();
        }
    }

    if (parts.length === 0 && country) {
        return { raw, parts: [], country };
    }

    let city: string | undefined;
    let state: string | undefined;

    if (country) {
        const cityMatch = cityIndex(country.isoCode).get(locationKey(parts[0]));
        if (cityMatch) {
            city = cityMatch.name;
            parts[0] = cityMatch.name;
            const stateMatch = stateIndex(country.isoCode).get(locationKey(cityMatch.stateCode));
            if (stateMatch) {
                state = stateMatch;
                if (!parts.some((part) => locationKey(part) === locationKey(stateMatch))) {
                    parts.push(stateMatch);
                }
            }
        }
        for (let i = 1; i < parts.length; i += 1) {
            const stateMatch = stateIndex(country.isoCode).get(locationKey(parts[i]));
            if (stateMatch) {
                state = stateMatch;
                parts[i] = stateMatch;
                break;
            }
        }
    } else if (contextCountry && parts.length === 1) {
        const cityMatch = cityIndex(contextCountry.isoCode).get(locationKey(parts[0]));
        if (cityMatch) {
            country = contextCountry;
            city = cityMatch.name;
            parts[0] = cityMatch.name;
            const stateMatch = stateIndex(contextCountry.isoCode).get(locationKey(cityMatch.stateCode));
            if (stateMatch) {
                state = stateMatch;
                parts.push(stateMatch);
            }
        }
    }

    return { raw, parts, city, state, country };
}

/** True when `outer` contains every part of `inner`. */
function covers(outer: ParsedLocation, inner: ParsedLocation): boolean {
    const outerKeys = new Set(outer.parts.map(locationKey));
    return inner.parts.every((part) => outerKeys.has(locationKey(part)));
}

/**
 * Normalize a list of raw location strings into display-ready labels.
 *
 * - A location already contained in a fuller one is dropped.
 * - A bare state/country that belongs to a city entry is folded into it.
 * - Names are canonicalised from the dataset.
 * - The country is omitted when every entry shares it.
 */
export function normalizeLocationLabels(locations?: string[] | null): LocationLabel[] {
    const rawLocations = splitRawLocations(locations);
    if (rawLocations.length === 0) return [];

    if (rawLocations.some((raw) => REMOTE_VALUES.has(locationKey(raw)))) {
        return [{ label: 'Remote', raw: rawLocations[0], isRemote: true }];
    }

    let parsed = rawLocations
        .map((raw) => parseLocation(raw))
        .filter((entry): entry is ParsedLocation => entry !== null);

    // One country in the set gives bare cities enough context to be placed.
    const detectedCountries = new Set(
        parsed.map((entry) => entry.country?.isoCode).filter((code): code is string => Boolean(code)),
    );
    if (detectedCountries.size === 1) {
        const context = parsed.find((entry) => entry.country)?.country;
        if (context) {
            parsed = parsed.map((entry) =>
                entry.country ? entry : (parseLocation(entry.raw, context) ?? entry),
            );
        }
    }

    // Collapse: drop an entry whose every part is covered by another entry.
    const kept: ParsedLocation[] = [];
    for (const entry of parsed) {
        if (entry.parts.length === 0) {
            if (!kept.some((other) => other.parts.length === 0 && other.country?.isoCode === entry.country?.isoCode)) {
                kept.push(entry);
            }
            continue;
        }
        if (kept.some((other) => other.parts.length > 0 && covers(other, entry))) continue;
        for (let i = kept.length - 1; i >= 0; i -= 1) {
            const other = kept[i];
            if (other.parts.length > 0 && covers(entry, other)) kept.splice(i, 1);
        }
        kept.push(entry);
    }

    const distinctCountries = new Set(
        kept.map((entry) => entry.country?.isoCode).filter((code): code is string => Boolean(code)),
    );

    // A country-only entry is redundant when the set already has places in it.
    const hasPlaces = kept.some((entry) => entry.parts.length > 0);
    const withoutRedundantCountry = hasPlaces && distinctCountries.size <= 1
        ? kept.filter((entry) => entry.parts.length > 0)
        : kept;

    const keepCountryInLabel = distinctCountries.size > 1;
    return withoutRedundantCountry.map((entry) => {
        const parts = entry.parts.length > 0 ? entry.parts : (entry.country ? [entry.country.name] : []);
        const labelParts = keepCountryInLabel && entry.country && entry.parts.length > 0
            ? [...parts, entry.country.name]
            : parts;
        return {
            label: labelParts.join(', '),
            raw: entry.raw,
            city: entry.city,
            state: entry.state,
            country: entry.country?.name,
            isRemote: false,
        };
    });
}

/** Render a location set for a caption or compact label. */
export function formatLocationText(
    locations?: string[] | null,
    options: LocationTextOptions = {},
): string {
    const { max = 2, separator = ' / ', moreSuffix = ' +' } = options;
    if (max <= 0) return '';

    const labels = normalizeLocationLabels(locations)
        .map((entry) => entry.label)
        .filter(Boolean);
    // Final safety net: drop exact-duplicate labels that survived normalisation.
    const distinct = [...new Set(labels)];
    if (distinct.length === 0) return '';

    return distinct.slice(0, max).join(separator) + (distinct.length > max ? moreSuffix : '');
}
