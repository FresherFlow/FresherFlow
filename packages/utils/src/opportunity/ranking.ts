import { Opportunity } from '@fresherflow/types';

/**
 * Weighted Feed Ranking System
 * Formula: score = freshness_weight + engagement_weight + trust_weight
 */

export const RANKING_WEIGHTS = {
    SHARE: 10,
    SAVE: 5,
    CLICK: 1,
    VERIFIED_BOOST: 20,
};

/**
 * Calculates a trending score for an opportunity.
 * Incorporates time decay to ensure freshness.
 */
export function calculateTrendingScore(data: {
    shares: number;
    saves: number;
    clicks: number;
    postedAt: Date | string;
    isVerified?: boolean;
}): number {
    const { shares, saves, clicks, postedAt, isVerified } = data;

    // 1. Base Engagement Score
    let baseScore = (shares * RANKING_WEIGHTS.SHARE) +
                    (saves * RANKING_WEIGHTS.SAVE) +
                    (clicks * RANKING_WEIGHTS.CLICK);

    // 2. Trust Boost
    if (isVerified) {
        baseScore += RANKING_WEIGHTS.VERIFIED_BOOST;
    }

    // 3. Time Decay (Gravity)
    // Score decreases as time passes.
    // formula: score / (hours_since_posted + 2)^1.5
    const postedDate = typeof postedAt === 'string' ? new Date(postedAt) : postedAt;
    const hoursSincePosted = Math.max(0, (Date.now() - postedDate.getTime()) / (1000 * 60 * 60));

    const gravity = 1.8;
    const timeDecay = Math.pow(hoursSincePosted + 2, gravity);

    return baseScore / timeDecay;
}

/**
 * Sorts opportunities by their trending score.
 */
export function sortOpportunitiesByTrending<T extends Opportunity>(opportunities: T[]): T[] {
    return [...opportunities].sort((a, b) => {
        const scoreA = a.trendingScore || 0;
        const scoreB = b.trendingScore || 0;
        return scoreB - scoreA;
    });
}
