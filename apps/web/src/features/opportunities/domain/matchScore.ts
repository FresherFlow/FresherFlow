import { calculateOpportunityMatch as sharedCalculateOpportunityMatch } from '@fresherflow/domain';
import type { Opportunity, Profile } from '@fresherflow/types';

export type MatchResult = {
    score: number;
    reason: string;
    isEligible: boolean;
};

export function calculateOpportunityMatch(profile: Profile | null | undefined, opportunity: Opportunity): MatchResult {
    return sharedCalculateOpportunityMatch(profile || null, opportunity);
}

/**
 * Returns true if the opportunity was explicitly marked as not eligible for this user.
 * Use this as a sort key to push not-eligible items to the bottom of any list.
 */
export function isNotEligible(opp: { matchScore?: number; matchReason?: string; isEligible?: boolean }): boolean {
    if (opp.isEligible === false) return true;
    return opp.matchScore === 0 && (opp.matchReason?.includes('Not eligible') ?? false);
}
