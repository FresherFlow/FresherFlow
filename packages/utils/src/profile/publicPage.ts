// Public profile reachability and the boost window — one rule, shared by the API gate,
// the sitemap, the owner-facing status UI and the mobile card.
//
// Two different questions live here. The old model conflated them, which is why the
// 7-day timer looked broken: it 404'd a page that had already been indexed.
//
//   1. Is fresherflow.in/u/<handle> reachable? That is publication, and nothing else:
//      `profilePublishedAt != null`. Publishing is permanent because it has to be —
//      once a page is crawled, cached or copied there is no switch that un-publishes
//      it. A lapsed window must never take the URL away.
//
//   2. Is the owner boosted? For PROFILE_BOOST_DAYS after publication, or after the
//      last re-boost. A boosted owner is listed in the recruiter directory and sorts
//      first inside it. When the boost lapses nothing goes dark and no link breaks:
//      the owner just stops being actively promoted, and gets a one-tap re-boost.
//
// One structural note: reachability also depends on `Profile.visibility` staying in
// (PUBLIC, UNLISTED). Nothing in the app can set PRIVATE — only the admin table can —
// so that axis is deliberately absent here.

/** How long a published page stays boosted (recruiter-directory presence). */
export const PROFILE_BOOST_DAYS = 7;

/** Surface the boost nudge once the owner is this close to the end of the window. */
export const PROFILE_BOOST_WARNING_DAYS = 2;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type ProfilePageStatus =
    /** Never published — `/u/<handle>` does not resolve. */
    | 'draft'
    /** Published, boost running. */
    | 'live'
    /** Published, boost lapses inside the warning window. */
    | 'lapsing'
    /** Published and reachable, boost lapsed. Only the promotion stopped. */
    | 'unboosted';

export interface ProfilePageState {
    status: ProfilePageStatus;
    /** The link resolves. False only before the first publication. */
    isPublished: boolean;
    /** Inside the boost window, so this owner shows up in the recruiter directory. */
    isBoosted: boolean;
    /** Whole days of boost left. 0 when never published or the boost has lapsed. */
    daysLeft: number;
    /** When the current boost lapses. Null when never published. */
    boostUntil: Date | null;
}

function toDate(value: Date | string | null | undefined): Date | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * The whole of reachability: has this profile ever been published?
 *
 * Use this, never a date comparison, wherever the question is "does the page open" —
 * the router, the OG image, the sitemap, and the owner's own status UI.
 */
export function isProfilePagePublished(publishedAt: Date | string | null | undefined): boolean {
    return toDate(publishedAt) !== null;
}

/**
 * Cutoff for the *boost* filter: rows published at or before this are published but
 * no longer promoted.
 *
 * Use as `profilePublishedAt: { gt: profileBoostSince() }`. This must only ever gate
 * promotion (the /browse directory, reminder email) — never the profile itself.
 */
export function profileBoostSince(now: Date = new Date()): Date {
    return new Date(now.getTime() - PROFILE_BOOST_DAYS * MS_PER_DAY);
}

/** When a boost stamped at `boostedAt` (i.e. that publication) lapses. */
export function profileBoostEndsAt(boostedAt: Date | string): Date {
    const boosted = toDate(boostedAt) ?? new Date(0);
    return new Date(boosted.getTime() + PROFILE_BOOST_DAYS * MS_PER_DAY);
}

export function getProfilePageState(
    publishedAt: Date | string | null | undefined,
    now: Date = new Date()
): ProfilePageState {
    const published = toDate(publishedAt);
    if (!published) {
        return { status: 'draft', isPublished: false, isBoosted: false, daysLeft: 0, boostUntil: null };
    }

    const boostUntil = profileBoostEndsAt(published);
    const remainingMs = boostUntil.getTime() - now.getTime();

    if (remainingMs <= 0) {
        return { status: 'unboosted', isPublished: true, isBoosted: false, daysLeft: 0, boostUntil };
    }

    return {
        status: remainingMs <= PROFILE_BOOST_WARNING_DAYS * MS_PER_DAY ? 'lapsing' : 'live',
        isPublished: true,
        isBoosted: true,
        daysLeft: Math.ceil(remainingMs / MS_PER_DAY),
        boostUntil,
    };
}
