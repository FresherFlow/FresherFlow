// @fresherflow/domain — Central Domain Logic

// Eligibility & Matching
export * from './eligibility/match.js';
export * from './eligibility/rules.js';
export * from './eligibility/academic-normalization.js';
export * from './eligibility/skill-normalization.js';
export type { EligibilityResult, RelevanceBreakdown, RankedOpportunity } from './eligibility/match.js';

// Profile
export * from './profile/completion.js';
export * from './profile/constants.js';
export * from './profile/validation.js';
export type { ProfileCompletionResult } from './profile/completion.js';

// Opportunity
export * from './opportunity/normalization.js';
export * from './opportunity/display.js';
export * from './opportunity/routing.js';
export * from './opportunity/events.js';

// Analytics
export * from './analytics/events.js';
export * from './analytics/funnel.js';


// Notifications
export * from './notifications/logic.js';

// Alerts
export * from './alerts/logic.js';

// Referral & Invites
export * from './referral/routing.js';

// Ingestion Dedupe
export * from './ingestion/dedupe.js';

export type { DomainEvent, OpportunityCreatedEvent, OpportunityPublishedEvent } from './opportunity/events.js';
export type { ListingState, TimelineEventView, EligibilitySnapshot, SharePlatform } from './opportunity/display.js';
export { 
    formatSalaryRange, formatExperienceRange, formatDisplayDate, formatTimeText12Hour, 
    parseOpportunityLocation, getOpportunityDisplaySalary, getListingState, 
    formatDeadline, getEducationDetails, buildEligibilitySnapshot, 
    getRelatedOpportunities, sortTimelineEvents, formatLpaValue, 
    isExpired, isClosingSoon, getCurrentActionType, 
    getTrackerOptions, buildShareUrl 
} from './opportunity/display.js';

export { 
    calculateOpportunityMatch, 
    isNotEligible 
} from './eligibility/match.js';

export { 
    normalizeSalaryInput 
} from './opportunity/normalization.js';

export { 
    buildLoginFromDetailHref, 
    getDetailShareUrl, 
    getOpportunityPath,
    getOpportunityPathFromItem 
} from './opportunity/routing.js';
