/**
 * Single home for the `?type=` ⇄ internal-kind mapping.
 *
 * This pair existed three times with three different alias sets:
 *
 * - `features/admin/opportunities/listUtils.ts` — `job/jobs`, `internship(s)`,
 *   `walk-in/walkin/walkins/walk-ins`
 * - `features/admin/opportunities/formUtils.ts` — the above plus `employment`,
 *   `walk_in` and `government/govt/government-job`
 * - `features/jobs/components/OpportunitiesFeedClient.tsx` — the first set plus
 *   `full-time`, but none of the government aliases
 *
 * So the same query string resolved to a different kind depending on which
 * surface read it — `/jobs?type=government` filtered by government on one
 * screen and fell through to a literal `GOVERNMENT` string on another.
 *
 * It lives in `lib/` rather than a feature because both `features/admin` and
 * `features/jobs` need it, and neither may import the other.
 */

/**
 * Query-value → kind. Keys are lower-cased; values match the internal kind
 * strings the API filters accept.
 */
const TYPE_ALIASES: Readonly<Record<string, string>> = {
    job: 'JOB',
    jobs: 'JOB',
    employment: 'JOB',
    'full-time': 'JOB',
    'full time': 'JOB',
    internship: 'INTERNSHIP',
    internships: 'INTERNSHIP',
    'walk-in': 'WALKIN',
    walkin: 'WALKIN',
    walkins: 'WALKIN',
    'walk-ins': 'WALKIN',
    walk_in: 'WALKIN',
    government: 'GOVERNMENT',
    govt: 'GOVERNMENT',
    'government-job': 'GOVERNMENT',
};

/**
 * Maps a `?type=` query value to its internal kind.
 *
 * Unknown values are upper-cased rather than dropped, so a kind added to the
 * API keeps working before an alias is registered here.
 */
export const typeParamToEnum = (value: string): string =>
    TYPE_ALIASES[value.trim().toLowerCase()] ?? value.toUpperCase();

/** The inverse, for writing a filter back into the URL. */
export const enumToTypeParam = (value: string): string => {
    if (value === 'JOB') return 'job';
    if (value === 'INTERNSHIP') return 'internship';
    if (value === 'WALKIN') return 'walk-in';
    return value.toLowerCase();
};
