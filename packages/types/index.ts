/* eslint-disable @typescript-eslint/no-explicit-any */
// Shared Types - Single Source of Truth
// Apps can import from here. This package NEVER imports from apps.

// ========================================
// ENUMS - Match Prisma schema exactly
// ========================================

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

// ========================================
// CORE ENTITY TYPES
// ========================================

export interface User {
    id: string;
    email?: string;
    fullName: string | null;
    role: Role;
    trustLevel?: UserTrustLevel;
    createdAt: Date | string;
    profile?: Profile;
    isTwoFactorEnabled?: boolean;
    isAnonymous: boolean;
    anon_id?: string;
    username: string | null;
    usernameUpdatedAt?: Date | string | null;
    lastLogin?: Date | string;
    isOptimistic?: boolean;
}

export interface Profile {
    id: string;
    userId: string;
    completionPercentage: number;

    // Education (40% weight)
    educationLevel: EducationLevel | null;
    tenthYear: number | null;
    twelfthYear: number | null;
    gradCourse: string | null;
    gradSpecialization: string | null;
    gradYear: number | null;
    pgCourse: string | null;
    pgSpecialization: string | null;
    pgYear: number | null;

    // Preferences (40% weight)
    interestedIn: OpportunityType[];
    preferredCities: string[];
    workModes: WorkMode[];

    // Readiness (20% weight)
    availability: Availability | null;
    skills: string[];
    skillTags?: string[]; // UI Mapping alias

    // Government Job Eligibility Fields
    dob?: Date | string | null;
    gender?: Gender | null;
    category?: ReservationCategory | null;
    isPwBD?: boolean | null;
    isExServicemen?: boolean | null;
    homeState?: string | null;
}

export interface Admin {
    id: string;
    email: string;
    fullName: string;
    role: Role;
    createdAt: Date;
    isTwoFactorEnabled?: boolean;
    totpEnabled?: boolean;
    totpEnabledAt?: Date | string | null;
}

export interface Opportunity {
    id: string;
    slug: string; // SEO-friendly URL slug
    type: OpportunityType;
    status: OpportunityStatus;

    // Basic Info
    title: string;
    company: string;
    companyWebsite?: string;
    companyLogoUrl?: string | null;
    description: string;

    // Eligibility
    allowedDegrees: EducationLevel[];
    allowedCourses: string[];
    allowedSpecializations?: string[];
    allowedPassoutYears: number[];
    passoutYearMin?: number | null;
    passoutYearMax?: number | null;
    allowedAvailability?: string | null;
    requiredSkills: string[];

    // Location
    locations: string[];
    workMode?: WorkMode;
    experienceMin?: number;
    experienceMax?: number;

    // Compensation
    salaryMin?: number;
    salaryMax?: number;
    salaryRange?: string;
    salaryPeriod?: SalaryPeriod;
    incentives?: string;
    jobFunction?: string;
    selectionProcess?: string;
    notesHighlights?: string;
    stipend?: string;
    employmentType?: string;
    tags?: string[];

    // UI Mapping Support
    salary?: {
        min: number;
        max: number;
        currency?: string;
    } | null;

    // Selection criteria
    experienceRange?: {
        min: number;
        max: number;
    };
    normalizedRole?: string;

    // Application
    sourceLink?: string;
    applyLink?: string;

    // Health Tracking (Verification Bot)
    linkHealth: LinkHealth;
    verificationFailures: number;
    lastVerifiedAt: Date | string;

    // User State (Dynamic)
    isSaved?: boolean;
    actions?: UserAction[];

    // Administrative
    postedAt: Date | string;
    publishedAt?: Date | string | null;
    deletedAt?: Date | string | null;
    deletionReason?: string | null;
    expiresAt?: Date | string | null;

    // Engagement Stats
    sharesCount: number;
    savesCount: number;
    clicksCount: number;
    commentsCount: number;
    trendingScore: number;
    appliedCount?: number;
    selectedCount?: number;

    postedByUserId: string;
    adminId: string;
    admin?: Admin;
    user?: {
        username: string | null;
        fullName: string | null;
    };

    // Walk-in Details (only if type === WALKIN)
    walkInDetails?: WalkInDetails;
    governmentJobDetails?: GovernmentJobDetails;
    applicationDetails?: ApplicationDetails | null;
    events?: OpportunityEvent[];
    socialPosts?: SocialPost[];
    shareCount?: number;
    isReferral?: boolean;
    referredByUsername?: string;
    rawIngestions?: Array<{
        creator?: {
            id: string;
            fullName: string | null;
            username?: string | null;
        } | null;
    }>;
}

export interface GovernmentApplicationFee {
    general?: number;
    obc?: number;
    ews?: number;
    sc?: number;
    st?: number;
    pwd?: number;
    female?: number;
    other?: Record<string, number>;
}

export interface GovernmentVacancy {
    postName: string;
    total?: number;
    categoryBreakup?: Record<string, number>;
    qualification?: string;
    age?: string;
}

export interface GovernmentExamDates {
    prelims?: string;
    mains?: string;
    skillTest?: string;
    interview?: string;
    medical?: string;
    documentVerification?: string;
    other?: string;
}

export interface GovernmentExamStage {
    name: string;
    date?: string;
    notes?: string;
}

export interface GovernmentRequiredDocument {
    name: string;
    mandatory?: boolean;
    notes?: string;
}

export interface GovernmentEligibilityDetails {
    education?: string[];
    age?: {
        min?: number;
        max?: number;
        notes?: string;
    };
    experience?: string[];
    additional?: string[];
}

export interface GovernmentJobDetails {
    id?: string;
    opportunityId?: string;
    department?: string;
    organization?: string;
    recruitingBody?: string;
    officialWebsiteUrl?: string;
    officialNotificationUrl?: string;
    advertisementNumber?: string;
    notificationIssuedDate?: string;
    applicationMode?: string;
    applicationStatus?: GovernmentApplicationStatus;
    governmentLevel?: GovernmentLevel;
    jobCategory?: string[];
    examName?: string;        // e.g. "SSC CGL", "RRB ALP"
    postName?: string;        // e.g. "Assistant Section Officer"
    
    vacancyCount?: number;
    vacancyNature?: VacancyNature;
    vacancyBreakdown?: any; // Replace with specific type if needed
    categoryVacancies?: any;
    cutOffMarks?: any;       // [{ year, category, marks }]
    
    payLevel?: string;
    basicPay?: number;
    allowances?: string[];
    
    applicationFee?: string;
    applicationFeeDetails?: any;
    feeBreakdown?: any;
    
    ageMin?: number;
    ageMax?: number;
    ageRelaxation?: string;
    ageRelaxationRules?: any;
    
    eligibilityDetails?: any;
    qualificationDetails?: any;
    physicalStandards?: any;
    
    cadreDetails?: any;
    postPreferences?: any;
    serviceBond?: any;
    
    reservationNotes?: string;
    reservationDetails?: any;
    importantInstructions?: string;
    
    applicationStartDate?: string;
    applicationEndDate?: string;
    examDate?: string;
    examDates?: any;
    examStages?: any;
    importantDates?: any;
    admitCardDate?: string;
    resultDate?: string;
    
    examCenters?: string[];
    examPattern?: any;
    selectionStages?: any;
    skillTests?: any;
    
    requiredDocuments?: string[];
    requiredDocumentDetails?: any;
    
    referenceLinks?: any;
    officialSourceVerified?: boolean;
    sourceLastCheckedAt?: string | Date;
    notificationPdfUrl?: string;
    admitCardUrl?: string;
    resultUrl?: string;
    answerKeyUrl?: string;
    syllabusUrl?: string;
    previousPapersUrl?: string;
    
    extraMetadata?: any;
    seoTags?: string[];
    
    extractionConfidence?: number;
}

export interface ApplicationDetails {
    method?: 'DIRECT' | 'FORM' | 'ASSESSMENT';
    platform?: string;
    estimatedMinutes?: number;
    requiredItems?: string[];
}


export interface SocialPost {
    id: string;
    opportunityId: string;
    platform: SocialPlatform;
    status: SocialPostStatus;
    externalPostId?: string | null;
    errorMessage?: string | null;
    publishedAt?: Date | string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
    retryCount: number;
    dedupeKey: string;
    opportunity?: {
        id: string;
        title: string;
        company: string;
    } | null;
    payload?: unknown;
}

export interface OpportunityEvent {
    id: string;
    opportunityId: string;
    eventType: OpportunityEventType;
    eventDate: Date | string;
    title: string;
    notes?: string;
    sourceLink?: string;
    createdAt: Date | string;
    updatedAt: Date | string;
}

export interface WalkInDetails {
    id: string;
    opportunityId: string;
    dates: string[];
    dateRange?: string;
    timeRange?: string;
    venueAddress: string;
    venueLink?: string;
    reportingTime: string;
    requiredDocuments: string[];
    contactPerson?: string;
    contactPhone?: string;
}

export interface UserAction {
    id: string;
    userId: string;
    opportunityId: string;
    actionType: ActionType;
    createdAt: Date | string;
    opportunity?: Opportunity;
}

export interface SavedOpportunity {
    id: string;
    userId: string;
    opportunityId: string;
    createdAt: Date | string;
    opportunity?: Opportunity;
}

export interface ListingFeedback {
    id: string;
    userId: string;
    opportunityId: string;
    reason: FeedbackReason;
    description?: string | null;
    createdAt: Date;
    user?: User;
    opportunity?: Opportunity;
}

export interface AppFeedback {
    id: string;
    userId: string;
    type: AppFeedbackType;
    rating?: number | null;
    message: string;
    pageUrl?: string | null;
    createdAt: Date | string;
    user?: User;
}

export interface RawOpportunity {
    id: string;
    sourceId: string;
    ingestionRunId?: string | null;
    sourceExternalId?: string | null;
    status: RawOpportunityStatus;
    rawPayload: unknown;
    title?: string | null;
    company?: string | null;
    sourceLink?: string | null;
    applyLink?: string | null;
    suggestedType?: OpportunityType | null;
    fresherScore?: number | null;
    reasonFlags: string[];
    mappedOpportunityId?: string | null;
    createdByUserId?: string | null;
    errorMessage?: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;

    // Included relations
    createdBy?: {
        id: string;
        fullName: string | null;
        email: string | null;
    } | null;
}

export interface RawOpportunityListResponse {
    submissions: RawOpportunity[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

// ========================================
// API RESPONSE TYPES
// ========================================

export interface AuthResponse {
    user: User;
    profile?: {
        completionPercentage: number;
    } | Profile;
    accessToken?: string;
    refreshToken?: string;
    firebaseCustomToken?: string;
}

export interface ProfileResponse {
    profile: Profile;
}

export interface OpportunitiesResponse {
    opportunities: Opportunity[];
    total: number;
}

export type OpportunityListResponse = OpportunitiesResponse;

export interface OpportunityDetailResponse {
    opportunity: Opportunity;
    isEligible: boolean;
    userAction?: UserAction;
}

export interface UserStatsResponse {
    appliedCount: number;
    plannedCount: number;
    interviewedCount: number;
    selectedCount: number;
}

// ========================================
// API REQUEST TYPES
// ========================================

export interface RegisterRequest {
    email: string;
    password: string;
    fullName: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface UpdateEducationRequest {
    educationLevel: EducationLevel;
    course: string;
    specialization: string;
    passoutYear: number;
}

export interface UpdatePreferencesRequest {
    interestedIn: OpportunityType[];
    preferredCities: string[];
    workModes: WorkMode[];
}

export interface UpdateReadinessRequest {
    availability: Availability;
    skills: string[];
}

export interface CreateOpportunityRequest {
    type: OpportunityType;
    title: string;
    company: string;
    description: string;
    allowedDegrees: EducationLevel[];
    allowedCourses: string[];
    allowedSpecializations?: string[];
    allowedPassoutYears: number[];
    requiredSkills: string[];
    locations: string[];
    workMode?: WorkMode;
    experienceMin?: number;
    experienceMax?: number;
    salaryMin?: number;
    salaryMax?: number;
    salaryPeriod?: SalaryPeriod;
    incentives?: string;
    jobFunction?: string;
    selectionProcess?: string;
    notesHighlights?: string;
    sourceLink?: string;
    applyLink?: string;
    expiresAt?: string;
    walkInDetails?: {
        dates: string[];
        venueAddress: string;
        reportingTime: string;
        requiredDocuments: string[];
        contactPerson?: string;
        contactPhone?: string;
    };
}

export interface TrackActionRequest {
    status: ActionType;
}

export interface SubmitFeedbackRequest {
    reason: FeedbackReason;
}

// ========================================
// FILTER/QUERY TYPES
// ========================================

export interface OpportunityFilters {
    type?: OpportunityType;
    city?: string;
    tag?: string;
    closingSoon?: boolean;
}

export interface AdminOpportunityFilters {
    type?: OpportunityType;
    status?: OpportunityStatus;
}

export interface StructuredLocation {
    name: string;
    state?: string;
    country?: string;
    type: 'city' | 'state' | 'country' | 'remote';
}

/** Shared output types for raw job extraction. */
export interface ParsedJob {
    company?: string;
    title?: string;
    locations: string[];
    structuredLocations?: StructuredLocation[];
    skills: string[];
    type: OpportunityType;
    allowedPassoutYears: number[];
    isFresherOnly: boolean;
    allowedDegrees: string[];
    allowedCourses?: string[];
    allowedSpecializations?: string[];
    isRemote: boolean;
    workMode: WorkMode;
    jobFunction?: string;
    incentives?: string;
    salaryPeriod?: SalaryPeriod;
    salaryMin?: number;
    salaryMax?: number;
    salaryRange?: string;
    experienceMin?: number;
    experienceMax?: number;
    dateRange?: string;
    timeRange?: string;
    venueLink?: string;
    venueAddress?: string;
    expiresAt?: string;
    description?: string;
    duplicateCount?: number;
}
// ========================================
// ALERT & NOTIFICATION TYPES
// ========================================

export type AlertKind = 'NEW_JOB' | 'DAILY_DIGEST' | 'CLOSING_SOON' | 'HIGHLIGHT' | 'APP_UPDATE' | 'EVENT_REMINDER' | 'ALL';

export interface AlertDelivery {
    id: string;
    kind: AlertKind;
    sentAt: string | Date;
    readAt: string | Date | null;
    opportunity: (Partial<Opportunity> & { id: string; isSaved?: boolean }) | null;
}

export interface AlertFeedResponse {
    deliveries: AlertDelivery[];
    unreadCount: number;
    total: number;
    hasMore: boolean;
}

// ========================================
// RESOURCE SHARING TYPES
// ========================================

export interface CreateSharedResourceRequest {
    url: string;
    title?: string;
    company?: string;
    skills?: string[];
}

export enum ResourceItemType {
    PDF = 'PDF',
    FILE = 'FILE',
    YOUTUBE = 'YOUTUBE',
    WEBSITE = 'WEBSITE',
    ROADMAP = 'ROADMAP',
    LINK = 'LINK'
}

export enum ResourceItemStatus {
    PENDING_REVIEW = 'PENDING_REVIEW',
    APPROVED = 'APPROVED'
}

export interface ResourceItem {
    id: string;
    collectionId: string;
    title: string;
    type: ResourceItemType;
    url: string;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export enum ResourceSector {
    PRIVATE = 'PRIVATE',
    GOVERNMENT = 'GOVERNMENT'
}

export interface ResourceCollection {
    id: string;
    title: string;
    description?: string | null;
    company?: string | null;
    skills: string[];
    tags: string[];
    addedByUserId?: string | null;
    addedByUsername?: string | null;
    status: ResourceItemStatus;
    createdAt: string | Date;
    updatedAt: string | Date;
    items: ResourceItem[];
    sector: ResourceSector;
}

export type SharedResource = ResourceCollection;

export interface CompanyResourceMetadata {
    logoUrl?: string | null;
    website?: string | null;
}

export interface ResourcesFeed {
    metadata: {
        version: string;
        updatedAt: number;
    };
    resources: ResourceCollection[];
    companyMetadata: Record<string, CompanyResourceMetadata>;
}

export interface AdminGetResourcesResponse {
    resources: ResourceCollection[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
}

export interface AdminUpdateResourceRequest {
    title?: string;
    description?: string | null;
    company?: string | null;
    skills?: string[];
    tags?: string[];
    status?: ResourceItemStatus;
    sector?: ResourceSector;
    items?: {
        id?: string;
        title: string;
        type: ResourceItemType;
        url: string;
    }[];
}

export interface AdminCreateResourceRequest {
    title: string;
    description?: string;
    company?: string | null;
    skills?: string[];
    tags?: string[];
    status?: ResourceItemStatus;
    sector?: ResourceSector;
    items: {
        title: string;
        type: ResourceItemType;
        url: string;
    }[];
}

