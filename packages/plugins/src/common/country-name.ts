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
