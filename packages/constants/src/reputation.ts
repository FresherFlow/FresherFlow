export enum ReputationPoints {
    LINK_SHARE = 50,
    LINK_VERIFIED = 100,
    REPORT_SUBMITTED = 10,
    REPORT_VALIDATED = 20,
    DUPLICATE_REPORT = -10,
    SPAM_SHARE = -100,
}

export enum ScoutLevel {
    NOVICE = 'Novice Scout',
    BRONZE = 'Bronze Scout',
    SILVER = 'Silver Scout',
    GOLD = 'Gold Scout',
    ELITE = 'Elite Scout',
}

export interface ScoutTier {
    level: ScoutLevel;
    minPoints: number;
    color: string; // Theme color name or hex (standardizing on mobile)
}

export const SCOUT_TIERS: ScoutTier[] = [
    { level: ScoutLevel.NOVICE, minPoints: 0, color: 'textMuted' },
    { level: ScoutLevel.BRONZE, minPoints: 100, color: 'accent' },
    { level: ScoutLevel.SILVER, minPoints: 500, color: 'secondary' },
    { level: ScoutLevel.GOLD, minPoints: 2000, color: 'warning' },
    { level: ScoutLevel.ELITE, minPoints: 5000, color: 'primary' },
];

export function getScoutLevel(points: number): ScoutTier {
    return (
        [...SCOUT_TIERS].reverse().find((tier) => points >= tier.minPoints) ||
        SCOUT_TIERS[0]
    );
}

export function getPointsToNextTier(points: number): number | null {
    const nextTier = SCOUT_TIERS.find((tier) => tier.minPoints > points);
    return nextTier ? nextTier.minPoints - points : null;
}
