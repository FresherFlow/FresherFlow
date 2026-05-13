import { UserTrustLevel } from '@fresherflow/types';

/**
 * Trust weights for different activities.
 */
export const REPUTATION_WEIGHTS = {
  VALID_SHARE: 0.1,    // Points for a share that gets published
  INVALID_SHARE: -0.5, // Penalty for a share that is rejected as spam/broken
  DUPLICATE_SHARE: -0.1, // Minor penalty for not checking existing listings
  REPORTEE_VALID: -1.0, // Major penalty if a published job is reported and archived
  REPORTER_VALID: 0.2, // Points for reporting a genuinely bad listing
  REPORTER_FALSE: -0.3, // Penalty for malicious reporting
};

/**
 * Thresholds for different trust levels.
 */
export const TRUST_LEVEL_THRESHOLDS = {
    VERIFIED: 1.0,
    CONTRIBUTOR: 5.0,
    MODERATOR: 20.0,
};

/**
 * Calculates the next trust level based on score thresholds.
 */
export function determineTrustLevel(score: number): UserTrustLevel {
  if (score < -5.0) return UserTrustLevel.BANNED;
  if (score >= TRUST_LEVEL_THRESHOLDS.MODERATOR) return UserTrustLevel.MODERATOR;
  if (score >= TRUST_LEVEL_THRESHOLDS.CONTRIBUTOR) return UserTrustLevel.CONTRIBUTOR;
  if (score >= TRUST_LEVEL_THRESHOLDS.VERIFIED) return UserTrustLevel.VERIFIED;
  return UserTrustLevel.NEW;
}

/**
 * Calculates a new trust score based on an action.
 */
export function calculateNewTrustScore(currentScore: number, action: keyof typeof REPUTATION_WEIGHTS): number {
    const change = REPUTATION_WEIGHTS[action];
    return Math.max(-10, currentScore + change);
}

/**
 * Calculates domain trust score adjustments.
 */
export function calculateDomainAdjustment(isOfficial: boolean, successRate: number): number {
  if (isOfficial) return 0.9; // Highly trusted
  if (successRate > 0.9) return 0.7;
  if (successRate < 0.2) return 0.1;
  return 0.5;
}
