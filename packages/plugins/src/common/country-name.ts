import { Country } from '@fresherflow/constants';

const REGION_CODE_RE = /^[A-Za-z]{2}$/;

let cachedDisplayNames: Intl.DisplayNames | null | undefined;

function getRegionDisplayNames(): Intl.DisplayNames | null {
  if (cachedDisplayNames !== undefined) return cachedDisplayNames;
  try {
    cachedDisplayNames = new Intl.DisplayNames(['en'], {
      type: 'region',
      fallback: 'none',
    });
  } catch {
    cachedDisplayNames = null;
  }
  return cachedDisplayNames;
}

/**
 * Resolve an ISO-3166 alpha-2 country code (e.g. `"NL"`) to its English display
 * name (e.g. `"Netherlands"`) using the runtime's CLDR-backed
 * `Intl.DisplayNames`. Output matches the full-name convention used elsewhere
 * (e.g. `US` -> `United States`, mirroring `location-parser`).
 *
 * Uses `fallback: 'none'` so unknown codes resolve to `undefined` rather than
 * the raw code. The literal CLDR sentinel `"Unknown Region"` (returned for the
 * special `ZZ` code) and any value that round-trips unchanged are also treated
 * as unresolved. Returns `null` for anything that is not a 2-letter code or
 * cannot be resolved.
 */
export function regionNameFromCode(
  code: string | null | undefined,
): string | null {
  if (!code || !REGION_CODE_RE.test(code)) return null;
  const upper = code.toUpperCase();
  const displayNames = getRegionDisplayNames();
  if (!displayNames) return null;
  try {
    const name = displayNames.of(upper);
    if (!name || name.toUpperCase() === upper || name === 'Unknown Region') {
      return null;
    }
    return name;
  } catch {
    return null;
  }
}

/**
 * Canonical country names from the shared `country-state-city` dataset
 * (re-exported by `@fresherflow/constants`), keyed by lowercase name and
 * lowercase ISO code. No country name is written in this module.
 */
const COUNTRY_NAME_BY_KEY = new Map<string, string>();
for (const country of Country.getAllCountries()) {
  COUNTRY_NAME_BY_KEY.set(countryKey(country.name), country.name);
  COUNTRY_NAME_BY_KEY.set(countryKey(country.isoCode), country.name);
}

/** Case/diacritic/period-insensitive key used for dataset lookups. */
function countryKey(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Resolve a country code (or a dataset country name) to the canonical name from
 * the dataset, e.g. `"IN"` -> `"India"`, `"U.S."` -> `"United States"`.
 *
 * Falls back to the runtime CLDR table ({@link regionNameFromCode}) for codes
 * the dataset does not carry. Returns `null` when nothing resolves.
 */
export function countryNameFromCode(
  code: string | null | undefined,
): string | null {
  if (!code) return null;
  const key = countryKey(code);
  if (!key) return null;
  return COUNTRY_NAME_BY_KEY.get(key) ?? regionNameFromCode(code.trim());
}

/**
 * Resolve a whole country-only label (`"India"`, `"IN"`, `"U.S."`) to the
 * canonical dataset name, or `null` when the label is not a country.
 *
 * Unlike {@link countryNameFromCode} there is no CLDR fallback: callers use
 * this to decide whether a label *is* a country, so an unknown token must stay
 * unresolved rather than being guessed.
 */
export function canonicalCountryName(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const key = countryKey(value);
  if (!key) return null;
  return COUNTRY_NAME_BY_KEY.get(key) ?? null;
}
