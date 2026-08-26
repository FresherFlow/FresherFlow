/* eslint-disable @typescript-eslint/no-explicit-any */
// Shared Types - Single Source of Truth
// Apps can import from here. This package NEVER imports from apps.

// ========================================
// ENUMS - Re-exported from single source of truth
// ========================================

import {
    OpportunityType,
    GovernmentApplicationStatus,
    GovernmentLevel,
    VacancyNature,
    Role,
    ReservationCategory,
    Gender,
    UserTrustLevel,
    OpportunityStatus,
    EducationLevel,
    WorkMode,
    SalaryPeriod,
    Availability,
    ActionType,
    OpportunityEventType,
    FeedbackReason,
    AppFeedbackType,
    LinkHealth,
    SocialPlatform,
    SocialPostStatus,
    RawOpportunityStatus,
    OrganizationType,
    OrgRole,
    MembershipStatus
} from './enums.js';

export * from './enums.js';

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
    collegeId?: string | null;
    collegeName?: string | null;
    collegeState?: string | null;
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

    // Derived & Candidate V1 Identity Fields
    headline?: string | null;
    about?: string | null;
    githubUrl?: string | null;
    linkedinUrl?: string | null;
    portfolioUrl?: string | null;
    avatarUrl?: string | null;
    githubPinnedRepos?: any | null;
    openToRecruiters?: boolean | null;
    profilePublic?: boolean | null;
    profilePublishedAt?: Date | string | null;
    visibility?: 'PUBLIC' | 'UNLISTED' | 'PRIVATE' | null;
    projects?: Project[];
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
    payScale?: string;
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
    latitude?: number;
    longitude?: number;
    techCluster?: string;
    selectionProcess?: string;
    expiryDate?: Date | string;
    reportingTime: string;
    requiredDocuments: string[];
    contactPerson?: string;
    contactPhone?: string;
    landmark?: string;
    transitInfo?: string;
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

// ============================================================================
// COMPANY REGISTRY & ATS TYPES
// ============================================================================

export interface Company {
    id: string;
    name: string;
    slug: string;
    website?: string | null;
    careersUrl?: string | null;
    logo?: string | null;
    industry?: string | null;
    size?: string | null;
    headquarters?: string | null;
    verified: boolean;
    active: boolean;
    createdAt: string | Date;
    updatedAt: string | Date;
    atsSources?: CompanyATS[];
    statistics?: CompanyStatistics | null;
    hiringHistory?: HiringHistory[];
}

export interface CompanyATS {
    id: string;
    companyId: string;
    provider: string;
    apiEndpoint?: string | null;
    boardToken?: string | null;
    careerUrl: string;
    enabled: boolean;
    lastSync?: string | Date | null;
    nextSync?: string | Date | null;
    failureCount: number;
    health: 'healthy' | 'degraded' | 'failing' | 'unknown';
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface CompanyStatistics {
    id: string;
    companyId: string;
    totalJobs: number;
    avgJobsPerMonth: number;
    lastHiringDate?: string | Date | null;
    medianSalary?: number | null;
    freshersScore: number;
    updatedAt: string | Date;
}

export interface HiringHistory {
    id: string;
    companyId: string;
    role: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    isCurrentRole?: boolean;
}

// ============================================================================
// ORGANIZATION TYPES
// ============================================================================

export interface Organization {
    id: string;
    name: string;
    slug: string;
    type: OrganizationType;
    logo?: string | null;
    website?: string | null;
    description?: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
    createdByUserId: string;
    members?: OrganizationMember[];
}

export interface OrganizationMember {
    id: string;
    organizationId: string;
    userId: string;
    role: OrgRole;
    title?: string | null;
    joinedAt: Date | string;
    user?: User;
}

// ============================================================================
// WORKSPACE/PROJECT TYPES
// ============================================================================

export interface Project {
    id: string;
    name: string;
    description?: string | null;
    userId: string;
    createdAt: Date | string;
    updatedAt: Date | string;
}

// ============================================================================
// CANDIDATE & RECRUITER TYPES
// ============================================================================

export enum CandidateInterestStatus {
    PENDING = 'PENDING',
    ACCEPTED = 'ACCEPTED',
    DECLINED = 'DECLINED',
    EXPIRED = 'EXPIRED',
    INTERVIEW_SCHEDULED = 'INTERVIEW_SCHEDULED',
    OFFER_SENT = 'OFFER_SENT',
    JOINED = 'JOINED',
    REJECTED = 'REJECTED'
}

export interface CandidateInterest {
    id: string;
    organizationId: string;
    recruiterId: string;
    candidateId: string;
    opportunityId?: string | null;
    message?: string | null;
    status: CandidateInterestStatus;
    createdAt: Date | string;
    updatedAt: Date | string;
    organization?: Organization;
    recruiter?: User;
    candidate?: User;
}

export interface SavedCandidate {
    id: string;
    recruiterId: string;
    candidateId: string;
    collectionName?: string | null;
    savedAt: Date | string;
    recruiter?: User;
    candidate?: User;
}

export interface ProfileView {
    id: string;
    candidateId: string;
    organizationId?: string | null;
    recruiterId: string;
    viewedAt: string | Date;
}

export interface OrganizationMembership {
    id: string;
    userId: string;
    organizationId: string;
    role: OrgRole;
    status: MembershipStatus;
    invitedBy?: string | null;
    joinedAt: string | Date;
}

export interface OrganizationInvite {
    id: string;
    organizationId: string;
    email: string;
    role: OrgRole;
    invitedBy: string;
    token: string;
    expiresAt: string | Date;
    acceptedAt?: string | Date | null;
    createdAt: string | Date;
}

export interface CompanyTargetResponse {
    id: string;
    company: string;
    ats: string;
    slug: string;
    active: boolean;
    priority: number;
    lastRunAt?: string;
    lastJobCount?: number;
    createdAt: string;
}

export interface CreateCompanyTargetPayload {
    company: string;
    ats: string;
    slug: string;
    active?: boolean;
    priority?: number;
}

export interface OpportunityCardDTO {
    id: string;
    slug: string;
    type: OpportunityType;
    status: OpportunityStatus;
    title: string;
    company: string;
    companyWebsite?: string;
    companyLogoUrl?: string | null;
    locations: string[];
    workMode?: WorkMode;
    salaryMin?: number;
    salaryMax?: number;
    salaryRange?: string;
    salaryPeriod?: SalaryPeriod;
    stipend?: string;
    employmentType?: string;
    tags?: string[];
    requiredSkills: string[];
    allowedPassoutYears?: number[];
    passoutYearMin?: number | null;
    passoutYearMax?: number | null;
    allowedDegrees?: EducationLevel[];
    allowedCourses?: string[];
    normalizedRole?: string;
    applyLink?: string;
    linkHealth?: LinkHealth;
    verificationFailures?: number;
    postedAt: Date | string;
    expiresAt?: Date | string | null;
    shareCount?: number;
    governmentJobDetails?: {
        jobCategory?: string[];
        totalVacancies?: number;
        applicationStatus?: GovernmentApplicationStatus;
        payScale?: string;
    };
}

export function toOpportunityCardDTO(opp: Opportunity): OpportunityCardDTO {
    return {
        id: opp.id,
        slug: opp.slug,
        type: opp.type,
        status: opp.status,
        title: opp.title,
        company: opp.company,
        companyWebsite: opp.companyWebsite,
        companyLogoUrl: opp.companyLogoUrl,
        locations: opp.locations || [],
        workMode: opp.workMode,
        salaryMin: opp.salaryMin,
        salaryMax: opp.salaryMax,
        salaryRange: opp.salaryRange,
        salaryPeriod: opp.salaryPeriod,
        stipend: opp.stipend,
        employmentType: opp.employmentType,
        tags: opp.tags || [],
        requiredSkills: opp.requiredSkills || [],
        allowedPassoutYears: opp.allowedPassoutYears || [],
        passoutYearMin: opp.passoutYearMin,
        passoutYearMax: opp.passoutYearMax,
        allowedDegrees: opp.allowedDegrees || [],
        allowedCourses: opp.allowedCourses || [],
        normalizedRole: opp.normalizedRole,
        applyLink: opp.applyLink,
        linkHealth: opp.linkHealth,
        verificationFailures: opp.verificationFailures,
        postedAt: opp.postedAt,
        expiresAt: opp.expiresAt,
        shareCount: opp.shareCount,
        governmentJobDetails: opp.governmentJobDetails ? {
            jobCategory: opp.governmentJobDetails.jobCategory,
            totalVacancies: opp.governmentJobDetails.vacancyCount,
            applicationStatus: opp.governmentJobDetails.applicationStatus,
            payScale: opp.governmentJobDetails.payScale,
        } : undefined,
    };
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export * from './schemas.js';

