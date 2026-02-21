// Shared Types - Single Source of Truth
// Apps can import from here. This package NEVER imports from apps.

// ========================================
// ENUMS - Match Prisma schema exactly
// ========================================

export enum OpportunityType {
    JOB = 'JOB',
    INTERNSHIP = 'INTERNSHIP',
    WALKIN = 'WALKIN'
}

export enum Role {
    USER = 'USER',
    ADMIN = 'ADMIN'
}

export enum OpportunityStatus {
    DRAFT = 'DRAFT',
    PUBLISHED = 'PUBLISHED',
    ARCHIVED = 'ARCHIVED',
    EXPIRED = 'EXPIRED'
}

export enum EducationLevel {
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
    INACCURATE = 'INACCURATE'
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

// ========================================
// CORE ENTITY TYPES
// ========================================

export interface User {
    id: string;
    email: string;
    fullName: string;
    role: Role;
    createdAt: Date;
    profile?: Profile;
    isTwoFactorEnabled?: boolean;
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
}

export interface Admin {
    id: string;
    email: string;
    fullName: string;
    createdAt: Date;
    isTwoFactorEnabled?: boolean;
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
    applyLink?: string;

    // Health Tracking (Verification Bot)
    linkHealth: LinkHealth;
    verificationFailures: number;
    lastVerifiedAt: Date;

    // User State (Dynamic)
    isSaved?: boolean;
    actions?: UserAction[];

    // Administrative
    postedAt: Date;
    expiresAt?: Date | string;
    adminId: string;
    admin?: Admin;

    // Walk-in Details (only if type === WALKIN)
    walkInDetails?: WalkInDetails;
    events?: OpportunityEvent[];
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
    createdAt: Date;
    opportunity?: Opportunity;
}

export interface ListingFeedback {
    id: string;
    userId: string;
    opportunityId: string;
    reason: FeedbackReason;
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
    createdAt: Date;
    user?: User;
}

// ========================================
// API RESPONSE TYPES
// ========================================

export interface AuthResponse {
    user: User;
    profile?: {
        completionPercentage: number;
    } | Profile;
}

export interface ProfileResponse {
    profile: Profile;
}

export interface OpportunitiesResponse {
    opportunities: Opportunity[];
    total: number;
}

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
    closingSoon?: boolean;
}

export interface AdminOpportunityFilters {
    type?: OpportunityType;
    status?: OpportunityStatus;
}
