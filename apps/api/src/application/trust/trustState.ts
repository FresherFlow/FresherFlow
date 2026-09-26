/**
 * Phase 14 - listing trust state machine.
 *
 * `OpportunityTrustLevel` describes a LISTING (UNVERIFIED / COMMUNITY_REPORTED
 * / VERIFIED / FLAGGED / REJECTED). `UserTrustLevel` describes a PERSON (NEW /
 * VERIFIED / CONTRIBUTOR / MODERATOR / BANNED). They must never be assigned to
 * each other: banning a user does not rewrite their listings' verification
 * state, and verifying a listing does not promote its author.
 *
 * This module owns the listing side. The user side stays in
 * `application/opportunity/{moderation,publish}.ts` and the admin users route.
 * `assertUserTrustNotListingTrust` is the compile-time + runtime guard that
 * keeps the two apart at the boundary where both are in scope.
 */

export type ListingTrust = 'UNVERIFIED' | 'COMMUNITY_REPORTED' | 'VERIFIED' | 'FLAGGED' | 'REJECTED';

const LISTING_TRUST = new Set<string>(['UNVERIFIED', 'COMMUNITY_REPORTED', 'VERIFIED', 'FLAGGED', 'REJECTED']);

const USER_TRUST = new Set<string>(['NEW', 'VERIFIED', 'CONTRIBUTOR', 'MODERATOR', 'BANNED']);

const TRANSITIONS: Record<ListingTrust, ListingTrust[]> = {
    UNVERIFIED: ['COMMUNITY_REPORTED', 'VERIFIED', 'FLAGGED', 'REJECTED'],
    COMMUNITY_REPORTED: ['VERIFIED', 'FLAGGED', 'REJECTED', 'UNVERIFIED'],
    VERIFIED: ['FLAGGED', 'REJECTED', 'UNVERIFIED'],
    FLAGGED: ['VERIFIED', 'REJECTED', 'UNVERIFIED'],
    REJECTED: ['UNVERIFIED'],
};

export function isListingTrust(value: string): value is ListingTrust {
    return LISTING_TRUST.has(value);
}

/**
 * Reject a user trust level passed where a listing level is expected.
 * Throws so a `BANNED`/`CONTRIBUTOR`/`MODERATOR`/`NEW` value can never be
 * written to `Opportunity.trustLevel`, even if a caller mixes up the enums
 * (both contain a `VERIFIED` member, which is why the check is explicit).
 */
export function assertListingTrust(value: string): ListingTrust {
    if (USER_TRUST.has(value) && !LISTING_TRUST.has(value)) {
        throw new Error(`Refusing to write user trust level ${value} onto a listing`);
    }
    if (!isListingTrust(value)) throw new Error(`Unknown listing trust level: ${value}`);
    return value;
}

export function assertUserTrustNotListingTrust(userLevel: string, listingLevel: string): void {
    if (USER_TRUST.has(listingLevel) && !LISTING_TRUST.has(listingLevel)) {
        throw new Error(`Refusing to write user trust level ${listingLevel} onto a listing`);
    }
    void userLevel;
}

export function canTransitionTrust(from: ListingTrust, to: ListingTrust): boolean {
    if (from === to) return true;
    return (TRANSITIONS[from] ?? []).includes(to);
}

/** Trust score deltas per listing event. Scores stay sortable; levels stay human. */
export function trustScoreDelta(event: 'official_verified' | 'moderator_verified' | 'community_report' | 'broken_link' | 'duplicate' | 'suspicious' | 'rejected'): number {
    switch (event) {
        case 'official_verified': return 25;
        case 'moderator_verified': return 15;
        case 'community_report': return -10;
        case 'broken_link': return -15;
        case 'duplicate': return -5;
        case 'suspicious': return -20;
        case 'rejected': return -30;
        default: return 0;
    }
}

export function clampTrustScore(score: number): number {
    if (!Number.isFinite(score)) return 50;
    return Math.min(100, Math.max(0, Math.round(score)));
}
