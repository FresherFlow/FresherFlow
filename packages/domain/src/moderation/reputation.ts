import { UserTrustLevel } from '@fresherflow/types';

/**
 * Trust weights for different activities.
 */
export const TRUST_WEIGHTS = {
  VALID_SHARE: 0.1,    // Points for a share that gets published
  INVALID_SHARE: -0.5, // Penalty for a share that is rejected as spam/broken
  DUPLICATE_SHARE: -0.1, // Minor penalty for not checking existing listings
  REPORTEE_VALID: -1.0, // Major penalty if a published job is reported and archived
  REPORTER_VALID: 0.2, // Points for reporting a genuinely bad listing
  REPORTER_FALSE: -0.3, // Penalty for malicious reporting
};

/**
 * Calculates the next trust level based on score thresholds.
 */
export function calculateTrustLevel(currentScore: number): UserTrustLevel {
  if (currentScore < -5.0) return UserTrustLevel.BANNED;
  if (currentScore > 10.0) return UserTrustLevel.MODERATOR;
  if (currentScore > 3.0) return UserTrustLevel.CONTRIBUTOR;
  if (currentScore >= 0.0) return UserTrustLevel.VERIFIED;
  return UserTrustLevel.NEW;
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
