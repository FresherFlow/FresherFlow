// Public profile page activation — the single rule that decides whether
// fresherflow.in/u/<handle> is reachable. Shared by the API gate (query filter)
// and the owner-facing UI (status card + dashboard nudge).

/** A published page stays live for this many days, then the owner has to reactivate it. */
export const PROFILE_PAGE_ACTIVE_DAYS = 7;

/** Warn the owner once the page is this close to going dark. */
export const PROFILE_PAGE_WARNING_DAYS = 2;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type ProfilePageStatus =
    /** Never published. */
    | 'draft'
    /** Published and comfortably inside the window. */
    | 'live'
    /** Published, inside the warning window — reactivation due soon. */
    | 'expiring'
    /** Was published, activation lapsed. The page is dark. */
    | 'expired';

export interface ProfilePageState {
    status: ProfilePageStatus;
    /** Whole days left before the page goes dark. 0 when never published or already dark. */
    daysLeft: number;
    /** When the current activation lapses. Null when never published. */
    expiresAt: Date | null;
}

function toDate(value: Date | string | null | undefined): Date | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Cutoff for the database filter: rows activated at or before this are dark.
 * Use as `profilePublishedAt: { gt: profilePageActiveSince() }`.
 */
export function profilePageActiveSince(now: Date = new Date()): Date {
    return new Date(now.getTime() - PROFILE_PAGE_ACTIVE_DAYS * MS_PER_DAY);
}

/** When an activation stamped at `activatedAt` lapses. */
export function profilePageExpiresAt(activatedAt: Date | string): Date {
    const activated = toDate(activatedAt) ?? new Date(0);
    return new Date(activated.getTime() + PROFILE_PAGE_ACTIVE_DAYS * MS_PER_DAY);
}

export function getProfilePageState(
    activatedAt: Date | string | null | undefined,
    now: Date = new Date()
): ProfilePageState {
    const activated = toDate(activatedAt);
    if (!activated) {
        return { status: 'draft', daysLeft: 0, expiresAt: null };
    }

    const expiresAt = profilePageExpiresAt(activated);
    const remainingMs = expiresAt.getTime() - now.getTime();

    if (remainingMs <= 0) {
        return { status: 'expired', daysLeft: 0, expiresAt };
    }

    return {
        status: remainingMs <= PROFILE_PAGE_WARNING_DAYS * MS_PER_DAY ? 'expiring' : 'live',
        daysLeft: Math.ceil(remainingMs / MS_PER_DAY),
        expiresAt,
    };
}

export function isProfilePageActive(
    activatedAt: Date | string | null | undefined,
    now: Date = new Date()
): boolean {
    const { status } = getProfilePageState(activatedAt, now);
    return status === 'live' || status === 'expiring';
}
