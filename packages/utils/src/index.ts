// Shared Utilities, Scoring, Normalization, Logger, Config & Eligibility Engine

// ── Pure Utilities & Formatters ──────────────────────────────
export * from './slugify.js';
export * from './companyLogo.js';
export * from './urlNormalization.js';
export * from './fingerprint.js';
export * from './domains.js';
export * from './driveTimeline.js';
export * from './user.js';
export * from './username.js';
export * from './auth.js';
export * from './telegram.js';
export * from './config.js';
export * from './logger.js';

// ── Ranking & Reputation ─────────────────────────────────────
export {
    calculateTrendingScore,
    sortOpportunitiesByTrending,
} from './opportunity/ranking.js';

export {
    determineTrustLevel,
    calculateNewTrustScore,
    calculateDomainAdjustment,
    REPUTATION_WEIGHTS,
} from './profile/reputation.js';

// ── Eligibility & Matching ───────────────────────────────────
export * from './eligibility/match.js';
export * from './eligibility/rules.js';
export * from './eligibility/academic-normalization.js';
export * from './eligibility/skill-normalization.js';
export * from './eligibility/scorer.js';
export * from './eligibility/weights.js';
export * from './eligibility/text-filters.js';
export * from './eligibility/title-location-triage.js';
export * from './eligibility/scoring-types.js';
export type { EligibilityResult, RelevanceBreakdown, RankedOpportunity } from './eligibility/match.js';

// ── Profile ──────────────────────────────────────────────────
export * from './profile/completion.js';
export * from './profile/constants.js';
export * from './profile/validation.js';
export type { ProfileCompletionResult } from './profile/completion.js';

// ── Opportunity Display, Normalization & Routing ─────────────
export * from './opportunity/normalization.js';
export * from './opportunity/display.js';
export * from './opportunity/routing.js';
export * from './opportunity/events.js';
export * from './opportunity/rules.js';
export * from './opportunity/walkin-clusters.js';
export * from './opportunity/walkin-extractor.js';

export type { DomainEvent, OpportunityCreatedEvent, OpportunityPublishedEvent } from './opportunity/events.js';
export type { ListingState, TimelineEventView, EligibilitySnapshot, SharePlatform } from './opportunity/display.js';

// ── Analytics & Notifications ────────────────────────────────
export * from './analytics/events.js';
export * from './analytics/funnel.js';
export * from './notifications/logic.js';
export * from './alerts/logic.js';
export * from './referral/routing.js';
export * from './ingestion/dedupe.js';

// Note: r2 is server-only (Node.js). Import directly: import { uploadToR2 } from '@fresherflow/utils/r2'
