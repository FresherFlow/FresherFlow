// Shared Enums - Single Source of Truth
// Match Prisma schema exactly

// -- Opportunity taxonomy (v2) ------------------------------------------------
// Independent dimensions. The old single `OpportunityType` mixed what an
// opportunity IS (JOB / INTERNSHIP / HACKATHONS), how you attend (WALKIN /
// REMOTE) and which sector it belongs to (GOVERNMENT), so every new concept
// needed a new enum value. Adding a concept is now just data.

export enum OpportunityCategory {
    EMPLOYMENT = 'EMPLOYMENT',
    COMPETITION = 'COMPETITION',
    SCHOLARSHIP = 'SCHOLARSHIP',
    EDUCATION = 'EDUCATION',
    EVENT = 'EVENT'
}

export enum EmploymentType {
    FULL_TIME = 'FULL_TIME',
    PART_TIME = 'PART_TIME',
    CONTRACT = 'CONTRACT',
    TEMPORARY = 'TEMPORARY',
    FREELANCE = 'FREELANCE',
    INTERNSHIP = 'INTERNSHIP',
    APPRENTICESHIP = 'APPRENTICESHIP',
    VOLUNTEER = 'VOLUNTEER',
    PER_DIEM = 'PER_DIEM',
    OTHER = 'OTHER'
}

// India-specific recruitment taxonomy. REGULAR covers ordinary open listings.
export enum RecruitmentMethod {
    REGULAR = 'REGULAR',
    ON_CAMPUS = 'ON_CAMPUS',
    OFF_CAMPUS = 'OFF_CAMPUS',
    POOL_CAMPUS = 'POOL_CAMPUS',
    WALK_IN = 'WALK_IN',
    REFERRAL = 'REFERRAL'
}

export enum Sector {
    PRIVATE = 'PRIVATE',
    GOVERNMENT = 'GOVERNMENT',
    NGO = 'NGO',
    ACADEMIC = 'ACADEMIC',
    STARTUP = 'STARTUP',
    OTHER = 'OTHER'
}

// Seniority band, separate from experienceMin / experienceMax.
export enum ExperienceLevel {
    ENTRY_LEVEL = 'ENTRY_LEVEL',
    INTERN = 'INTERN',
    ASSOCIATE = 'ASSOCIATE',
    MID = 'MID',
    SENIOR = 'SENIOR',
    LEAD = 'LEAD',
    EXECUTIVE = 'EXECUTIVE'
}

// How the listing entered the platform: community submission vs bot scrape.
export enum OpportunitySourceKind {
    SCRAPED = 'SCRAPED',
    USER_SUBMITTED = 'USER_SUBMITTED',
    IMPORTED = 'IMPORTED',
    PARTNER_FEED = 'PARTNER_FEED'
}

// The community funnel: one record for "applied to a job", "registered for a
// hackathon" and "enrolled in a scholarship".
export enum ApplicationStage {
    APPLIED = 'APPLIED',
    REGISTERED = 'REGISTERED',
    IN_REVIEW = 'IN_REVIEW',
    ASSESSMENT = 'ASSESSMENT',
    INTERVIEW = 'INTERVIEW',
    OFFERED = 'OFFERED',
    ACCEPTED = 'ACCEPTED',
    REJECTED = 'REJECTED',
    WITHDRAWN = 'WITHDRAWN',
    SKIPPED = 'SKIPPED',
    PARTICIPATED = 'PARTICIPATED'
}

export enum CompensationType {
    SALARY = 'SALARY',
    STIPEND = 'STIPEND',
    EQUITY = 'EQUITY',
    BONUS = 'BONUS',
    COMMISSION = 'COMMISSION',
    PER_DIEM = 'PER_DIEM',
    REIMBURSEMENT = 'REIMBURSEMENT',
    OTHER = 'OTHER'
}

export enum EquityUnit {
    ESOP = 'ESOP',
    RSU = 'RSU',
    OPTIONS = 'OPTIONS',
    SHARES = 'SHARES',
    PHANTOM = 'PHANTOM',
    OTHER = 'OTHER'
}

export enum GovernmentApplicationStatus {
    UPCOMING = 'UPCOMING',
    OPEN = 'OPEN',
    CLOSED = 'CLOSED',
    EXAM_SCHEDULED = 'EXAM_SCHEDULED',
    ADMIT_CARD_RELEASED = 'ADMIT_CARD_RELEASED',
    ANSWER_KEY_RELEASED = 'ANSWER_KEY_RELEASED',
    RESULT_DECLARED = 'RESULT_DECLARED',
    COUNSELLING = 'COUNSELLING',
    DOCUMENT_VERIFICATION = 'DOCUMENT_VERIFICATION',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED'
}

export enum GovernmentLevel {
    CENTRAL = 'CENTRAL',
    STATE = 'STATE',
    PSU = 'PSU',
    BANKING = 'BANKING',
    DEFENCE = 'DEFENCE',
    JUDICIARY = 'JUDICIARY',
    EDUCATION = 'EDUCATION'
}

export enum VacancyNature {
    PERMANENT = 'PERMANENT',
    TEMPORARY = 'TEMPORARY',
    CONTRACT = 'CONTRACT',
    APPRENTICESHIP = 'APPRENTICESHIP',
    DEPUTATION = 'DEPUTATION'
}

export enum Role {
    USER = 'USER',
    ADMIN = 'ADMIN'
}

export enum ReservationCategory {
    GENERAL = 'GENERAL',
    OBC = 'OBC',
    SC = 'SC',
    ST = 'ST',
    EWS = 'EWS'
}

export enum Gender {
    MALE = 'MALE',
    FEMALE = 'FEMALE',
    OTHER = 'OTHER'
}

export enum UserTrustLevel {
    BANNED = 'BANNED',
    NEW = 'NEW',
    VERIFIED = 'VERIFIED',
    CONTRIBUTOR = 'CONTRIBUTOR',
    MODERATOR = 'MODERATOR'
}

export enum OpportunityStatus {
    DRAFT = 'DRAFT',
    PUBLISHED = 'PUBLISHED',
    ARCHIVED = 'ARCHIVED',
    EXPIRED = 'EXPIRED'
}

export enum EducationLevel {
    TENTH = 'TENTH',
    INTER = 'INTER',
    DIPLOMA = 'DIPLOMA',
    DEGREE = 'DEGREE',
    PG = 'PG'
}

export enum WorkMode {
    ONSITE = 'ONSITE',
    HYBRID = 'HYBRID',
    REMOTE = 'REMOTE'
}

export enum SalaryPeriod {
    MONTHLY = 'MONTHLY',
    YEARLY = 'YEARLY'
}

export enum Availability {
    IMMEDIATE = 'IMMEDIATE',
    DAYS_15 = 'DAYS_15',
    MONTH_1 = 'MONTH_1'
}

export enum ActionType {
    APPLIED = 'APPLIED',
    PLANNED = 'PLANNED',
    INTERVIEWED = 'INTERVIEWED',
    SELECTED = 'SELECTED',
    VIEWED = 'VIEWED',
    SHARED = 'SHARED',
    OA = 'OA',
    REJECTED = 'REJECTED',
    REPORTED = 'REPORTED',
    // Backward-compatible legacy values
    PLANNING = 'PLANNING',
    ATTENDED = 'ATTENDED',
    NOT_ELIGIBLE = 'NOT_ELIGIBLE'
}

export enum OpportunityEventType {
    NOTIFICATION = 'NOTIFICATION',
    REG_START = 'REG_START',
    REG_END = 'REG_END',
    EXAM_DATE = 'EXAM_DATE',
    RESULT = 'RESULT',
    INTERVIEW = 'INTERVIEW',
    DOC_VERIFICATION = 'DOC_VERIFICATION',
    OTHER = 'OTHER'
}

export enum FeedbackReason {
    EXPIRED = 'EXPIRED',
    LINK_BROKEN = 'LINK_BROKEN',
    DUPLICATE = 'DUPLICATE',
    INACCURATE = 'INACCURATE',
    SPAM = 'SPAM',
    OTHER = 'OTHER'
}

export enum AppFeedbackType {
    BUG = 'BUG',
    IDEA = 'IDEA',
    PRAISE = 'PRAISE',
    OTHER = 'OTHER'
}

export enum LinkHealth {
    HEALTHY = 'HEALTHY',
    BROKEN = 'BROKEN',
    RETRYING = 'RETRYING'
}

export enum SocialPlatform {
    X = 'X',
    LINKEDIN = 'LINKEDIN',
    FACEBOOK = 'FACEBOOK'
}

export enum SocialPostStatus {
    PENDING = 'PENDING',
    PUBLISHED = 'PUBLISHED',
    FAILED = 'FAILED',
    DISABLED = 'DISABLED',
    DRY_RUN = 'DRY_RUN'
}

export enum RawOpportunityStatus {
    FETCHED = 'FETCHED',
    PARSED = 'PARSED',
    DRAFT_CREATED = 'DRAFT_CREATED',
    REJECTED = 'REJECTED',
    DEDUPED = 'DEDUPED',
    FAILED = 'FAILED'
}

export enum OrganizationType {
    COMPANY = 'COMPANY',
    ENGINEERING_COLLEGE = 'ENGINEERING_COLLEGE',
    TRAINING_INSTITUTE = 'TRAINING_INSTITUTE',
    BOOTCAMP = 'BOOTCAMP',
    NGO = 'NGO',
    PLACEMENT_CELL = 'PLACEMENT_CELL'
}

export enum OrgRole {
    OWNER = 'OWNER',
    ADMIN = 'ADMIN',
    RECRUITER = 'RECRUITER',
    VIEWER = 'VIEWER'
}

export enum MembershipStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED'
}

// ========================================
// COMMUNITY ENUMS (plan 09b §6.3 — must match schema.prisma exactly)
// ========================================

export enum CommentType {
    GENERAL = 'GENERAL',
    QUESTION = 'QUESTION',
    EXPERIENCE = 'EXPERIENCE',
    UPDATE = 'UPDATE',
    CORRECTION = 'CORRECTION',
    WARNING = 'WARNING',
    REFERRAL = 'REFERRAL'
}

export enum CommentVoteValue {
    UPVOTE = 'UPVOTE',
    DOWNVOTE = 'DOWNVOTE'
}

export enum JobSignalType {
    APPLIED = 'APPLIED',
    INTERVIEWED = 'INTERVIEWED',
    OFFER = 'OFFER',
    CLOSED = 'CLOSED',
    HELPFUL = 'HELPFUL',
    INCORRECT = 'INCORRECT'
}

export enum JobSubmissionStatus {
    PUBLISHED = 'PUBLISHED',
    MERGED = 'MERGED',
    PENDING_REVIEW = 'PENDING_REVIEW',
    REJECTED = 'REJECTED'
}

export enum ReportReason {
    SPAM = 'SPAM',
    INACCURATE = 'INACCURATE',
    EXPIRED = 'EXPIRED',
    OFFENSIVE = 'OFFENSIVE',
    OTHER = 'OTHER'
}

export enum ReportStatus {
    OPEN = 'OPEN',
    REVIEWING = 'REVIEWING',
    RESOLVED = 'RESOLVED',
    DISMISSED = 'DISMISSED'
}

export enum NotificationType {
    COMMENT_REPLY = 'COMMENT_REPLY',
    COMMENT_VOTE = 'COMMENT_VOTE',
    JOB_SIGNAL_MILESTONE = 'JOB_SIGNAL_MILESTONE',
    JOB_UPDATED = 'JOB_UPDATED',
    JOB_CLOSED = 'JOB_CLOSED',
    NEW_MATCHING_JOB = 'NEW_MATCHING_JOB',
    EXPIRED_JOB = 'EXPIRED_JOB',
    COMMENT_ON_EXPIRED = 'COMMENT_ON_EXPIRED',
    ROOM_HELPFUL = 'ROOM_HELPFUL'
}

export enum CommunityPostCategory {
    DISCUSSION = 'DISCUSSION',
    QUESTION = 'QUESTION',
    EXPERIENCE = 'EXPERIENCE',
    INTERVIEW_EXPERIENCE = 'INTERVIEW_EXPERIENCE',
    HIRING_UPDATE = 'HIRING_UPDATE',
    UPDATE = 'UPDATE',
    REFERRAL = 'REFERRAL',
    OTHER = 'OTHER'
}

export enum CommunityPostStatus {
    ACTIVE = 'ACTIVE',
    ARCHIVED = 'ARCHIVED',
    DELETED = 'DELETED'
}

export enum InterviewResult {
    SELECTED = 'SELECTED',
    REJECTED = 'REJECTED',
    WAITING = 'WAITING',
    WITHDRAWN = 'WITHDRAWN'
}

export enum InterviewDifficulty {
    EASY = 'EASY',
    MEDIUM = 'MEDIUM',
    HARD = 'HARD',
    VERY_HARD = 'VERY_HARD'
}

export enum ApplicationStatus {
    APPLIED = 'APPLIED',
    ASSESSMENT_RECEIVED = 'ASSESSMENT_RECEIVED',
    ASSESSMENT_COMPLETED = 'ASSESSMENT_COMPLETED',
    INTERVIEW_SCHEDULED = 'INTERVIEW_SCHEDULED',
    INTERVIEW_COMPLETED = 'INTERVIEW_COMPLETED',
    SELECTED = 'SELECTED',
    REJECTED = 'REJECTED',
    WAITING = 'WAITING',
    NO_RESPONSE = 'NO_RESPONSE'
}

// A Room is not a CommunityPost, so it has its own lifecycle.
export enum RoomStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED'
}

export enum RoomMemberRole {
  MEMBER = 'MEMBER',
  MODERATOR = 'MODERATOR',
  ADMIN = 'ADMIN'
}

export enum RoomOpportunityReason {
  PINNED = 'PINNED',
  SHARED = 'SHARED'
}

export enum ReferralRequestStatus {
    OPEN = 'OPEN',
    FULFILLED = 'FULFILLED',
    CLOSED = 'CLOSED'
}

export enum SalaryReportType {
    OFFER = 'OFFER',
    CURRENT_CTC = 'CURRENT_CTC'
}
