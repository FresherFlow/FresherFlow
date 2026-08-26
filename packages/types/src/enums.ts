// Shared Enums - Single Source of Truth
// Match Prisma schema exactly

export enum OpportunityType {
    JOB = 'JOB',
    INTERNSHIP = 'INTERNSHIP',
    WALKIN = 'WALKIN',
    REMOTE = 'REMOTE',
    GOVERNMENT = 'GOVERNMENT',
    HACKATHONS = 'HACKATHONS'
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
