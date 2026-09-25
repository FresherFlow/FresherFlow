// AUTO-GENERATED from packages/database/prisma/schema.prisma. Do not hand-edit.
//
// Every Prisma enum re-exported by `@fresherflow/database`, as plain objects.
// Test-only helper: `vi.mock('@fresherflow/database', ...)` factories spread
// this in so a schema enum split (or a new enum) cannot break test collection
// with `No "X" export is defined on the mock`.

export const Role = {
    USER: 'USER',
    ADMIN: 'ADMIN',
} as const;

export const ReservationCategory = {
    GENERAL: 'GENERAL',
    OBC: 'OBC',
    SC: 'SC',
    ST: 'ST',
    EWS: 'EWS',
} as const;

export const Gender = {
    MALE: 'MALE',
    FEMALE: 'FEMALE',
    OTHER: 'OTHER',
} as const;

export const OpportunityCategory = {
    EMPLOYMENT: 'EMPLOYMENT',
    COMPETITION: 'COMPETITION',
    SCHOLARSHIP: 'SCHOLARSHIP',
    EDUCATION: 'EDUCATION',
    EVENT: 'EVENT',
} as const;

export const EmploymentType = {
    FULL_TIME: 'FULL_TIME',
    PART_TIME: 'PART_TIME',
    CONTRACT: 'CONTRACT',
    TEMPORARY: 'TEMPORARY',
    FREELANCE: 'FREELANCE',
    INTERNSHIP: 'INTERNSHIP',
    APPRENTICESHIP: 'APPRENTICESHIP',
    VOLUNTEER: 'VOLUNTEER',
    PER_DIEM: 'PER_DIEM',
    OTHER: 'OTHER',
} as const;

export const RecruitmentMethod = {
    REGULAR: 'REGULAR',
    ON_CAMPUS: 'ON_CAMPUS',
    OFF_CAMPUS: 'OFF_CAMPUS',
    POOL_CAMPUS: 'POOL_CAMPUS',
    WALK_IN: 'WALK_IN',
    REFERRAL: 'REFERRAL',
} as const;

export const WorkMode = {
    ONSITE: 'ONSITE',
    HYBRID: 'HYBRID',
    REMOTE: 'REMOTE',
} as const;

export const Sector = {
    PRIVATE: 'PRIVATE',
    GOVERNMENT: 'GOVERNMENT',
    NGO: 'NGO',
    ACADEMIC: 'ACADEMIC',
    STARTUP: 'STARTUP',
    OTHER: 'OTHER',
} as const;

export const ExperienceLevel = {
    ENTRY_LEVEL: 'ENTRY_LEVEL',
    INTERN: 'INTERN',
    ASSOCIATE: 'ASSOCIATE',
    MID: 'MID',
    SENIOR: 'SENIOR',
    LEAD: 'LEAD',
    EXECUTIVE: 'EXECUTIVE',
} as const;

export const OpportunitySourceKind = {
    SCRAPED: 'SCRAPED',
    USER_SUBMITTED: 'USER_SUBMITTED',
    IMPORTED: 'IMPORTED',
    PARTNER_FEED: 'PARTNER_FEED',
} as const;

export const OpportunityStatus = {
    DRAFT: 'DRAFT',
    PUBLISHED: 'PUBLISHED',
    ARCHIVED: 'ARCHIVED',
} as const;

export const UserStatus = {
    ACTIVE: 'ACTIVE',
    SUSPENDED: 'SUSPENDED',
    DEACTIVATED: 'DEACTIVATED',
} as const;

export const RoleType = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    MODERATOR: 'MODERATOR',
} as const;

export const ActorType = {
    USER: 'USER',
    SYSTEM: 'SYSTEM',
    WORKER: 'WORKER',
    API: 'API',
} as const;

export const GovernmentApplicationStatus = {
    UPCOMING: 'UPCOMING',
    OPEN: 'OPEN',
    CLOSED: 'CLOSED',
    EXAM_SCHEDULED: 'EXAM_SCHEDULED',
    ADMIT_CARD_RELEASED: 'ADMIT_CARD_RELEASED',
    ANSWER_KEY_RELEASED: 'ANSWER_KEY_RELEASED',
    RESULT_DECLARED: 'RESULT_DECLARED',
    COUNSELLING: 'COUNSELLING',
    DOCUMENT_VERIFICATION: 'DOCUMENT_VERIFICATION',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
} as const;

export const GovernmentLevel = {
    CENTRAL: 'CENTRAL',
    STATE: 'STATE',
    PSU: 'PSU',
    LOCAL: 'LOCAL',
    OTHER: 'OTHER',
} as const;

export const VacancyNature = {
    PERMANENT: 'PERMANENT',
    TEMPORARY: 'TEMPORARY',
    CONTRACT: 'CONTRACT',
    APPRENTICESHIP: 'APPRENTICESHIP',
    DEPUTATION: 'DEPUTATION',
} as const;

export const ActionType = {
    APPLIED: 'APPLIED',
    PLANNED: 'PLANNED',
    INTERVIEWED: 'INTERVIEWED',
    SELECTED: 'SELECTED',
    SHARED: 'SHARED',
    OA: 'OA',
    REJECTED: 'REJECTED',
    REPORTED: 'REPORTED',
    PLANNING: 'PLANNING',
    ATTENDED: 'ATTENDED',
    NOT_ELIGIBLE: 'NOT_ELIGIBLE',
} as const;

export const FeedbackReason = {

} as const;

export const AppFeedbackType = {
    BUG: 'BUG',
    IDEA: 'IDEA',
    PRAISE: 'PRAISE',
    OTHER: 'OTHER',
} as const;

export const EducationLevel = {
    TENTH: 'TENTH',
    INTER: 'INTER',
    DIPLOMA: 'DIPLOMA',
    DEGREE: 'DEGREE',
    PG: 'PG',
} as const;

export const SalaryPeriod = {
    MONTHLY: 'MONTHLY',
    YEARLY: 'YEARLY',
} as const;

export const Availability = {
    IMMEDIATE: 'IMMEDIATE',
    DAYS_15: 'DAYS_15',
    MONTH_1: 'MONTH_1',
} as const;

export const ProfileVisibility = {
    PUBLIC: 'PUBLIC',
    UNLISTED: 'UNLISTED',
    PRIVATE: 'PRIVATE',
} as const;

export const LinkHealth = {
    HEALTHY: 'HEALTHY',
    BROKEN: 'BROKEN',
    RETRYING: 'RETRYING',
} as const;

export const GrowthFunnelEvent = {
    DETAIL_VIEW: 'DETAIL_VIEW',
    LOGIN_VIEW: 'LOGIN_VIEW',
    AUTH_SUCCESS: 'AUTH_SUCCESS',
    SIGNUP_SUCCESS: 'SIGNUP_SUCCESS',
    SAVE_JOB: 'SAVE_JOB',
    APPLY_CLICK: 'APPLY_CLICK',
    SHARE_JOB: 'SHARE_JOB',
    SIGNUP_VIEW: 'SIGNUP_VIEW',
    INSTALL_PROMPT_SHOWN: 'INSTALL_PROMPT_SHOWN',
    INSTALL_ACCEPTED: 'INSTALL_ACCEPTED',
    OPENED_STANDALONE: 'OPENED_STANDALONE',
    APP_INIT: 'APP_INIT',
} as const;

export const PlatformEventType = {
    VIEW_JOB: 'VIEW_JOB',
    CLICK_APPLY: 'CLICK_APPLY',
    SHARE_JOB: 'SHARE_JOB',
    SAVE_JOB: 'SAVE_JOB',
    REFERRAL_HIT: 'REFERRAL_HIT',
    REFERRAL_CLICK: 'REFERRAL_CLICK',
    APP_INIT: 'APP_INIT',
    AUTH_STEP: 'AUTH_STEP',
} as const;

export const ReferralBadge = {
    FIRST_INVITE: 'FIRST_INVITE',
    CONNECTOR: 'CONNECTOR',
    CAMPUS_SCOUT: 'CAMPUS_SCOUT',
    GROWTH_NODE: 'GROWTH_NODE',
    NETWORK_BUILDER: 'NETWORK_BUILDER',
} as const;

export const AlertChannel = {
    EMAIL: 'EMAIL',
    APP: 'APP',
    PUSH: 'PUSH',
} as const;

export const AlertKind = {
    DAILY_DIGEST: 'DAILY_DIGEST',
    CLOSING_SOON: 'CLOSING_SOON',
    HIGHLIGHT: 'HIGHLIGHT',
    APP_UPDATE: 'APP_UPDATE',
    EVENT_REMINDER: 'EVENT_REMINDER',
    REGISTRATION_CLOSING: 'REGISTRATION_CLOSING',
    APPLICATION_UPDATE: 'APPLICATION_UPDATE',
} as const;

export const AlertDispatchStatus = {
    INITIATED: 'INITIATED',
    SENT: 'SENT',
    FAILED: 'FAILED',
    SKIPPED: 'SKIPPED',
} as const;

export const AlertDispatchReason = {
    DEDUPE_HIT: 'DEDUPE_HIT',
    DAILY_CAP: 'DAILY_CAP',
    PREFERENCE_DISABLED: 'PREFERENCE_DISABLED',
    NOT_ELIGIBLE: 'NOT_ELIGIBLE',
    CHANNEL_ERROR: 'CHANNEL_ERROR',
    ENUM_FALLBACK: 'ENUM_FALLBACK',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    SENT_OK: 'SENT_OK',
} as const;

export const OpportunityEventType = {
    NOTIFICATION: 'NOTIFICATION',
    REG_START: 'REG_START',
    REG_END: 'REG_END',
    EXAM_DATE: 'EXAM_DATE',
    RESULT: 'RESULT',
    INTERVIEW: 'INTERVIEW',
    DOC_VERIFICATION: 'DOC_VERIFICATION',
    ASSESSMENT_RELEASED: 'ASSESSMENT_RELEASED',
    SHORTLIST: 'SHORTLIST',
    DRIVE_POSTPONED: 'DRIVE_POSTPONED',
    DRIVE_CLOSED: 'DRIVE_CLOSED',
    REOPENED: 'REOPENED',
    OTHER: 'OTHER',
} as const;

export const EventAuthorRole = {
    USER: 'USER',
    MODERATOR: 'MODERATOR',
    ADMIN: 'ADMIN',
    SYSTEM: 'SYSTEM',
} as const;

export const EventVerification = {
    UNVERIFIED: 'UNVERIFIED',
    VERIFIED: 'VERIFIED',
    REJECTED: 'REJECTED',
} as const;

export const SocialPlatform = {
    X: 'X',
    LINKEDIN: 'LINKEDIN',
    FACEBOOK: 'FACEBOOK',
} as const;

export const SocialPostStatus = {
    PENDING: 'PENDING',
    PUBLISHED: 'PUBLISHED',
    FAILED: 'FAILED',
    DISABLED: 'DISABLED',
    DRY_RUN: 'DRY_RUN',
} as const;

export const UserTrustLevel = {
    NEW: 'NEW',
    VERIFIED: 'VERIFIED',
    CONTRIBUTOR: 'CONTRIBUTOR',
    MODERATOR: 'MODERATOR',
    BANNED: 'BANNED',
} as const;

export const ResourceItemType = {
    PDF: 'PDF',
    FILE: 'FILE',
    YOUTUBE: 'YOUTUBE',
    WEBSITE: 'WEBSITE',
    ROADMAP: 'ROADMAP',
    LINK: 'LINK',
} as const;

export const ResourceItemStatus = {
    PENDING_REVIEW: 'PENDING_REVIEW',
    APPROVED: 'APPROVED',
} as const;

export const CompensationType = {
    SALARY: 'SALARY',
    STIPEND: 'STIPEND',
    EQUITY: 'EQUITY',
    BONUS: 'BONUS',
    COMMISSION: 'COMMISSION',
    PER_DIEM: 'PER_DIEM',
    REIMBURSEMENT: 'REIMBURSEMENT',
    OTHER: 'OTHER',
} as const;

export const EquityUnit = {
    ESOP: 'ESOP',
    RSU: 'RSU',
    OPTIONS: 'OPTIONS',
    SHARES: 'SHARES',
    PHANTOM: 'PHANTOM',
    OTHER: 'OTHER',
} as const;

export const OpportunityTrustLevel = {
    UNVERIFIED: 'UNVERIFIED',
    COMMUNITY_REPORTED: 'COMMUNITY_REPORTED',
    VERIFIED: 'VERIFIED',
    FLAGGED: 'FLAGGED',
    REJECTED: 'REJECTED',
} as const;

export const ApplicationStage = {
    APPLIED: 'APPLIED',
    REGISTERED: 'REGISTERED',
    IN_REVIEW: 'IN_REVIEW',
    ASSESSMENT: 'ASSESSMENT',
    INTERVIEW: 'INTERVIEW',
    OFFERED: 'OFFERED',
    ACCEPTED: 'ACCEPTED',
    REJECTED: 'REJECTED',
    WITHDRAWN: 'WITHDRAWN',
    SKIPPED: 'SKIPPED',
    PARTICIPATED: 'PARTICIPATED',
} as const;

export const TelegramBroadcastStatus = {
    SENT: 'SENT',
    FAILED: 'FAILED',
    SKIPPED: 'SKIPPED',
} as const;

export const IngestionSourceType = {
    JSON_FEED: 'JSON_FEED',
    WORKDAY: 'WORKDAY',
    GREENHOUSE: 'GREENHOUSE',
    LEVER: 'LEVER',
    CUSTOM: 'CUSTOM',
} as const;

export const IngestionRunStatus = {
    RUNNING: 'RUNNING',
    SUCCESS: 'SUCCESS',
    PARTIAL: 'PARTIAL',
    FAILED: 'FAILED',
} as const;

export const RawOpportunityStatus = {
    FETCHED: 'FETCHED',
    DRAFT_CREATED: 'DRAFT_CREATED',
    DEDUPED: 'DEDUPED',
    REJECTED: 'REJECTED',
    ERROR: 'ERROR',
} as const;

export const FollowType = {
    TAG: 'TAG',
    COMPANY: 'COMPANY',
    CONTRIBUTOR: 'CONTRIBUTOR',
} as const;

export const CommentType = {
    GENERAL: 'GENERAL',
    QUESTION: 'QUESTION',
    EXPERIENCE: 'EXPERIENCE',
    UPDATE: 'UPDATE',
    CORRECTION: 'CORRECTION',
    WARNING: 'WARNING',
    REFERRAL: 'REFERRAL',
} as const;

export const CommentVoteValue = {
    UPVOTE: 'UPVOTE',
    DOWNVOTE: 'DOWNVOTE',
} as const;

export const JobSignalType = {
    APPLIED: 'APPLIED',
    INTERVIEWED: 'INTERVIEWED',
    OFFER: 'OFFER',
    CLOSED: 'CLOSED',
    HELPFUL: 'HELPFUL',
    INCORRECT: 'INCORRECT',
} as const;

export const JobSubmissionStatus = {
    PUBLISHED: 'PUBLISHED',
    MERGED: 'MERGED',
    PENDING_REVIEW: 'PENDING_REVIEW',
    REJECTED: 'REJECTED',
} as const;

export const ReportReason = {
    SPAM: 'SPAM',
    INACCURATE: 'INACCURATE',
    EXPIRED: 'EXPIRED',
    OFFENSIVE: 'OFFENSIVE',
    OTHER: 'OTHER',
} as const;

export const ReportStatus = {
    OPEN: 'OPEN',
    REVIEWING: 'REVIEWING',
    RESOLVED: 'RESOLVED',
    DISMISSED: 'DISMISSED',
} as const;

export const CommunityPostCategory = {
    DISCUSSION: 'DISCUSSION',
    QUESTION: 'QUESTION',
    EXPERIENCE: 'EXPERIENCE',
    INTERVIEW_EXPERIENCE: 'INTERVIEW_EXPERIENCE',
    HIRING_UPDATE: 'HIRING_UPDATE',
    UPDATE: 'UPDATE',
    REFERRAL: 'REFERRAL',
    OTHER: 'OTHER',
} as const;

export const CommunityPostStatus = {
    ACTIVE: 'ACTIVE',
    ARCHIVED: 'ARCHIVED',
    DELETED: 'DELETED',
} as const;

export const NotificationType = {
    COMMENT_REPLY: 'COMMENT_REPLY',
    COMMENT_VOTE: 'COMMENT_VOTE',
    JOB_SIGNAL_MILESTONE: 'JOB_SIGNAL_MILESTONE',
    JOB_UPDATED: 'JOB_UPDATED',
    JOB_CLOSED: 'JOB_CLOSED',
    NEW_MATCHING_JOB: 'NEW_MATCHING_JOB',
    EXPIRED_JOB: 'EXPIRED_JOB',
    COMMENT_ON_EXPIRED: 'COMMENT_ON_EXPIRED',
    ROOM_HELPFUL: 'ROOM_HELPFUL',
    INTRO_REQUEST: 'INTRO_REQUEST',
    CAMPUS_DRIVE_MATCH: 'CAMPUS_DRIVE_MATCH',
    REGISTRATION_OPEN: 'REGISTRATION_OPEN',
    REGISTRATION_CLOSING: 'REGISTRATION_CLOSING',
    OPPORTUNITY_APPLIED: 'OPPORTUNITY_APPLIED',
    APPLICATION_STAGE_CHANGED: 'APPLICATION_STAGE_CHANGED',
} as const;

export const ResourceSector = {
    PRIVATE: 'PRIVATE',
    GOVERNMENT: 'GOVERNMENT',
} as const;

export const IntroRequestStatus = {
    PENDING: 'PENDING',
    CONTACTED: 'CONTACTED',
    ARCHIVED: 'ARCHIVED',
} as const;

export const OrganizationType = {
    COMPANY: 'COMPANY',
    ENGINEERING_COLLEGE: 'ENGINEERING_COLLEGE',
    TRAINING_INSTITUTE: 'TRAINING_INSTITUTE',
    BOOTCAMP: 'BOOTCAMP',
    NGO: 'NGO',
    PLACEMENT_CELL: 'PLACEMENT_CELL',
} as const;

export const OrgRole = {
    OWNER: 'OWNER',
    ADMIN: 'ADMIN',
    RECRUITER: 'RECRUITER',
    VIEWER: 'VIEWER',
} as const;

export const MembershipStatus = {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
} as const;

export const CandidateInterestStatus = {
    PENDING: 'PENDING',
    ACCEPTED: 'ACCEPTED',
    DECLINED: 'DECLINED',
    EXPIRED: 'EXPIRED',
    INTERVIEW_SCHEDULED: 'INTERVIEW_SCHEDULED',
    OFFER_SENT: 'OFFER_SENT',
    JOINED: 'JOINED',
    REJECTED: 'REJECTED',
} as const;

export const InterviewResult = {
    SELECTED: 'SELECTED',
    REJECTED: 'REJECTED',
    WAITING: 'WAITING',
    WITHDRAWN: 'WITHDRAWN',
} as const;

export const InterviewDifficulty = {
    EASY: 'EASY',
    MEDIUM: 'MEDIUM',
    HARD: 'HARD',
    VERY_HARD: 'VERY_HARD',
} as const;

export const ApplicationStatus = {
    APPLIED: 'APPLIED',
    ASSESSMENT_RECEIVED: 'ASSESSMENT_RECEIVED',
    ASSESSMENT_COMPLETED: 'ASSESSMENT_COMPLETED',
    INTERVIEW_SCHEDULED: 'INTERVIEW_SCHEDULED',
    INTERVIEW_COMPLETED: 'INTERVIEW_COMPLETED',
    SELECTED: 'SELECTED',
    REJECTED: 'REJECTED',
    WAITING: 'WAITING',
    NO_RESPONSE: 'NO_RESPONSE',
} as const;

export const RoomStatus = {
    ACTIVE: 'ACTIVE',
    ARCHIVED: 'ARCHIVED',
    DELETED: 'DELETED',
} as const;

export const RoomMemberRole = {
    MEMBER: 'MEMBER',
    MODERATOR: 'MODERATOR',
    ADMIN: 'ADMIN',
} as const;

export const RoomOpportunityReason = {

} as const;

export const ReferralRequestStatus = {
    OPEN: 'OPEN',
    FULFILLED: 'FULFILLED',
    CLOSED: 'CLOSED',
} as const;

export const RecruitmentStageKind = {
    SCREENING: 'SCREENING',
    ASSESSMENT: 'ASSESSMENT',
    INTERVIEW: 'INTERVIEW',
    CASE_STUDY: 'CASE_STUDY',
    GROUP_EXERCISE: 'GROUP_EXERCISE',
    OFFER: 'OFFER',
    TRAINING: 'TRAINING',
    ONBOARDING: 'ONBOARDING',
    OTHER: 'OTHER',
} as const;

export const SalaryReportType = {
    OFFER: 'OFFER',
    CURRENT_CTC: 'CURRENT_CTC',
} as const;
