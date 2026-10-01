/**
 * Which filters belong to which feed.
 *
 * The site has three genuinely different products sharing one filter bar:
 * Jobs, Walk-ins and Government. They are not variations of one list — a
 * walk-in is a physical errand with a date, a venue and a distance, while a
 * government listing has an exam timeline and a phase, and neither concept
 * means anything to the other.
 *
 * That distinction used to live as copy-pasted `isGovt` / `isWalkin` booleans
 * inside each filter surface. There were four such surfaces, they had already
 * drifted apart, and the drift was user-visible:
 *
 *  - "Walk-ins" was offered as a type option on the government page, where it
 *    filters to nothing.
 *  - The mobile drawer had no drive filters at all, so a walk-in reader on a
 *    phone could not filter by date or distance, and the distance filter never
 *    reached them.
 *
 * Declare the dimensions once here and have every surface read from this.
 */

export type FeedKind = 'JOB' | 'WALKIN' | 'GOVERNMENT';

/** Every filter dimension the product knows about. */
export type FilterDimension =
    | 'type'
    | 'location'
    | 'workMode'
    | 'role'
    | 'skills'
    | 'course'
    | 'qualification'
    | 'sector'
    | 'source'
    | 'year'
    | 'company'
    | 'batch'
    | 'govtPhase'
    | 'govtCategory'
    | 'driveDate'
    | 'driveRadius';

/** Type options offered per feed. `null` is the "all" row. */
const TYPE_OPTIONS: Record<FeedKind, Array<{ label: string; value: string | null }>> = {
    JOB: [
        { label: 'All types', value: null },
        { label: 'Jobs', value: 'JOB' },
        { label: 'Internships', value: 'INTERNSHIP' },
        // A walk-in is its own feed, so it is not a job type to narrow within.
        { label: 'Walk-ins', value: 'WALKIN' },
    ],
    WALKIN: [
        { label: 'All types', value: null },
        { label: 'Jobs', value: 'JOB' },
        { label: 'Internships', value: 'INTERNSHIP' },
    ],
    GOVERNMENT: [
        { label: 'All types', value: null },
    ],
};

/**
 * Dimensions shown per feed, before any progressive-disclosure collapsing.
 *
 * Walk-ins keep `location` and `role` because a drive is still a role at a
 * place; they add `driveDate` and `driveRadius`, which are the two things that
 * decide whether a walk-in is worth the trip.
 */
const DIMENSIONS: Record<FeedKind, FilterDimension[]> = {
    JOB: [
        'type',
        'location',
        'workMode',
        'role',
        'skills',
        'course',
        'qualification',
        'sector',
        'source',
        'year',
        'company',
        'batch',
    ],
    WALKIN: [
        'type',
        'location',
        'workMode',
        'role',
        'skills',
        'qualification',
        'source',
        'year',
        'company',
        'driveDate',
        'driveRadius',
    ],
    GOVERNMENT: [
        'type',
        'location',
        'qualification',
        'sector',
        'source',
        'year',
        'company',
        'govtPhase',
        'govtCategory',
    ],
};

/**
 * Normalise whatever the route gave us into one of the three feeds.
 *
 * Unknown values fall back to `JOB` rather than to nothing: an unrecognised
 * `?type=` should show the jobs filter bar, not an empty one.
 */
export function toFeedKind(pageType: string | null | undefined): FeedKind {
    if (!pageType) return 'JOB';
    const upper = pageType.toUpperCase();
    if (upper === 'WALKIN' || upper === 'WALK_IN' || upper === 'WALK-IN') return 'WALKIN';
    if (upper === 'GOVERNMENT' || upper === 'GOVT' || upper === 'GOV') return 'GOVERNMENT';
    return 'JOB';
}

export function getFeedKind(pageType: string | null | undefined): FeedKind {
    return toFeedKind(pageType);
}

export function getTypeOptions(feed: FeedKind) {
    return TYPE_OPTIONS[feed];
}

/** True when the feed exposes the given dimension. Use this to gate a pill. */
export function supportsDimension(
    feed: FeedKind,
    dimension: FilterDimension
): boolean {
    return DIMENSIONS[feed].includes(dimension);
}

export const isGovtFeed = (feed: FeedKind) => feed === 'GOVERNMENT';
export const isWalkinFeed = (feed: FeedKind) => feed === 'WALKIN';
