import { z } from 'zod';
import { OpportunityType, OpportunityStatus, WorkMode, EducationLevel, Availability, ActionType, FeedbackReason, SalaryPeriod, AppFeedbackType, ReservationCategory, Gender, CommentType, CommentVoteValue, JobSignalType, ReportReason } from '@fresherflow/types';

const governmentApplicationFeeSchema = z.object({
    general: z.number().nonnegative().optional(),
    obc: z.number().nonnegative().optional(),
    ews: z.number().nonnegative().optional(),
    sc: z.number().nonnegative().optional(),
    st: z.number().nonnegative().optional(),
    pwd: z.number().nonnegative().optional(),
    female: z.number().nonnegative().optional(),
    other: z.record(z.string(), z.number().nonnegative()).optional(),
});

const governmentVacancySchema = z.object({
    postName: z.string().min(1),
    total: z.number().int().nonnegative().optional(),
    categoryBreakup: z.record(z.string(), z.number().int().nonnegative()).optional(),
    qualification: z.string().optional(),
    age: z.string().optional(),
});

const governmentExamDatesSchema = z.object({
    prelims: z.string().optional(),
    mains: z.string().optional(),
    skillTest: z.string().optional(),
    interview: z.string().optional(),
    medical: z.string().optional(),
    documentVerification: z.string().optional(),
    other: z.string().optional(),
});

const governmentEligibilitySchema = z.object({
    education: z.array(z.string()).optional().default([]),
    age: z.object({
        min: z.number().int().nonnegative().optional(),
        max: z.number().int().nonnegative().optional(),
        notes: z.string().optional(),
    }).optional(),
    experience: z.array(z.string()).optional().default([]),
    additional: z.array(z.string()).optional().default([]),
});

const governmentRequiredDocumentSchema = z.object({
    name: z.string().min(1),
    mandatory: z.boolean().optional(),
    notes: z.string().optional(),
});

// Auth Schemas
export const registerSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    fullName: z.string().min(1, 'Full name is required')
});

export const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required')
});

export const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required')
});

export const sendOtpSchema = z.object({
    email: z.string().email('Invalid email format')
});

export const verifyOtpSchema = z.object({
    email: z.string().email('Invalid email format'),
    code: z.string().length(6, 'Verification code must be 6 digits'),
    firebaseUid: z.string().optional(),
    source: z.string().optional(),
    ref: z.string().optional()
});

export const googleAuthSchema = z.object({
    token: z.string().min(1, 'Token is required'),
    firebaseUid: z.string().optional(),
    source: z.string().optional(),
    ref: z.string().optional()
});

// Profile Schemas
export const profileUpdateSchema = z.object({
    fullName: z.string().optional(),
    headline: z.string().nullable().optional(),
    about: z.string().nullable().optional(),
    githubUrl: z.string().url().nullable().optional().or(z.literal('')),
    linkedinUrl: z.string().url().nullable().optional().or(z.literal('')),
    portfolioUrl: z.string().url().nullable().optional().or(z.literal('')),
    avatarUrl: z.string().url().nullable().optional().or(z.literal('')),
    githubPinnedRepos: z.any().nullable().optional(),
    openToRecruiters: z.boolean().nullable().optional(),
    profilePublic: z.boolean().nullable().optional(),
    visibility: z.enum(['PUBLIC', 'UNLISTED', 'PRIVATE']).nullable().optional(),
    educationLevel: z.nativeEnum(EducationLevel).optional(),
    tenthYear: z.number().int().optional(),
    twelfthYear: z.number().int().optional(),
    gradCourse: z.string().optional(),
    gradSpecialization: z.string().optional(),
    gradYear: z.number().int().optional(),
    collegeId: z.string().nullable().optional(),
    collegeName: z.string().nullable().optional(),
    collegeState: z.string().nullable().optional(),
    pgCourse: z.string().optional(),
    pgSpecialization: z.string().optional(),
    pgYear: z.number().int().optional(),
    interestedIn: z.array(z.nativeEnum(OpportunityType)).optional(),
    preferredCities: z.array(z.string()).optional(),
    workModes: z.array(z.nativeEnum(WorkMode)).optional(),
    availability: z.nativeEnum(Availability).optional(),
    skills: z.array(z.string()).optional(),
    dob: z.string().nullable().optional(),
    gender: z.nativeEnum(Gender).nullable().optional(),
    category: z.nativeEnum(ReservationCategory).nullable().optional(),
    isPwBD: z.boolean().nullable().optional(),
    isExServicemen: z.boolean().nullable().optional(),
    homeState: z.string().nullable().optional(),
});

export const educationSchema = z.object({
    educationLevel: z.nativeEnum(EducationLevel),

    // 10th Details
    tenthYear: z.number().int().min(1000, 'Year must be 4 digits').max(9999, 'Year must be 4 digits'),

    // 12th Details
    twelfthYear: z.number().int().min(1000, 'Year must be 4 digits').max(9999, 'Year must be 4 digits'),

    // Graduation Details
    gradCourse: z.string().min(1, 'Course name is required'),
    gradSpecialization: z.string().min(1, 'Specialization is required'),
    gradYear: z.number().int().min(1000, 'Year must be 4 digits').max(9999, 'Year must be 4 digits'),
    collegeId: z.string().optional().nullable(),
    collegeName: z.string().optional().nullable(),
    collegeState: z.string().optional().nullable(),

    // PG (Optional)
    pgCourse: z.string().optional(),
    pgSpecialization: z.string().optional(),
    pgYear: z.number().int().min(1000, 'Year must be 4 digits').max(9999, 'Year must be 4 digits').optional(),

    // Government Job Eligibility Fields
    dob: z.preprocess((val) => {
        if (typeof val === 'string' && val.trim() !== '') {
            const d = new Date(val);
            if (!isNaN(d.getTime())) return d;
        }
        return val === '' ? undefined : val;
    }, z.date().optional().nullable()),
    gender: z.nativeEnum(Gender).optional().nullable(),
    category: z.nativeEnum(ReservationCategory).optional().nullable(),
    isPwBD: z.boolean().optional().nullable(),
    isExServicemen: z.boolean().optional().nullable(),
    homeState: z.string().optional().nullable()
});

export const preferencesSchema = z.object({
    interestedIn: z.array(z.nativeEnum(OpportunityType)).optional().default([]),
    preferredCities: z.array(z.string()).max(5, 'Select up to 5 cities').optional().default([]),
    workModes: z.array(z.nativeEnum(WorkMode)).optional().default([])
});

export const readinessSchema = z.object({
    availability: z.nativeEnum(Availability),
    skills: z.array(z.string()).min(1, 'Add at least one skill')
});

const applicationDetailsSchema = z.object({
    method: z.enum(['DIRECT', 'FORM', 'ASSESSMENT']).optional(),
    platform: z.string().optional(),
    estimatedMinutes: z.number().int().positive().optional(),
    requiredItems: z.array(z.string()).optional()
});

// Admin Schemas
export const opportunitySchema = z.object({
    type: z.nativeEnum(OpportunityType).optional(), // Backend
    status: z.nativeEnum(OpportunityStatus).optional(),
    category: z.enum(['job', 'internship', 'walk-in']).optional(), // Frontend alias
    rawOpportunityId: z.string().optional(),
    applicationDetails: applicationDetailsSchema.nullable().optional(),

    title: z.string().min(1, 'Title is required'),
    company: z.string().min(1, 'Company is required'),
    companyWebsite: z.string().url().nullable().optional().or(z.string().length(0).nullable().optional()),
    companyLogoUrl: z.string().url().nullable().optional().or(z.string().length(0).nullable().optional()),
    description: z.string().min(10, 'Description must be at least 10 characters').nullable().optional(),

    // Core Filters
    allowedDegrees: z.array(z.nativeEnum(EducationLevel)).optional().default([]),
    allowedCourses: z.array(z.string()).optional().default([]),
    allowedSpecializations: z.array(z.string()).optional().default([]),
    allowedPassoutYears: z.array(z.number().int()).optional().default([]),
    requiredSkills: z.array(z.string()).default([]),
    locations: z.array(z.string()).optional().default([]),

    // Job/Internship Fields
    workMode: z.nativeEnum(WorkMode).nullable().optional(),
    salaryMin: z.number().nullable().optional(), // Legacy
    salaryMax: z.number().nullable().optional(), // Legacy
    salaryRange: z.string().nullable().optional(), // New
    stipend: z.string().nullable().optional(),     // New
    salaryPeriod: z.nativeEnum(SalaryPeriod).nullable().optional(),
    incentives: z.string().nullable().optional(),
    jobFunction: z.string().nullable().optional(),
    selectionProcess: z.string().nullable().optional(),
    notesHighlights: z.string().nullable().optional(),
    experienceMin: z.number().nullable().optional(),
    experienceMax: z.number().nullable().optional(),
    employmentType: z.string().nullable().optional(), // New
    tags: z.array(z.string()).optional().default([]),
    sourceLink: z.string().url().nullable().optional().or(z.string().length(0).nullable().optional()),
    applyLink: z.string().url().nullable().optional().or(z.string().length(0).nullable().optional()),

    expiresAt: z.string().nullable().optional(),
    governmentJobDetails: z.object({
        department: z.string().nullable().optional(),
        organization: z.string().nullable().optional(),
        recruitingBody: z.string().nullable().optional(),
        officialWebsiteUrl: z.string().url().or(z.string().length(0)).nullable().optional(),
        officialNotificationUrl: z.string().url().or(z.string().length(0)).nullable().optional(),
        advertisementNumber: z.string().nullable().optional(),
        postName: z.string().nullable().optional(),
        applicationModes: z.array(z.string()).nullable().optional().default([]),
        vacancyCount: z.number().int().nonnegative().nullable().optional(),
        vacancies: z.array(governmentVacancySchema).nullable().optional().default([]),
        applicationFee: z.string().nullable().optional(),
        applicationFeeDetails: governmentApplicationFeeSchema.nullable().optional(),
        ageMin: z.number().int().nonnegative().nullable().optional(),
        ageMax: z.number().int().nonnegative().nullable().optional(),
        ageRelaxation: z.string().nullable().optional(),
        eligibilityDetails: governmentEligibilitySchema.nullable().optional(),
        reservationNotes: z.string().nullable().optional(),
        importantInstructions: z.string().nullable().optional(),
        applicationStartDate: z.string().nullable().optional(),
        applicationEndDate: z.string().nullable().optional(),
        examDate: z.string().nullable().optional(),
        examDates: governmentExamDatesSchema.nullable().optional(),
        admitCardDate: z.string().nullable().optional(),
        resultDate: z.string().nullable().optional(),
        selectionStages: z.array(z.string()).nullable().optional().default([]),
        requiredDocuments: z.array(z.string()).nullable().optional().default([]),
        requiredDocumentDetails: z.array(governmentRequiredDocumentSchema).nullable().optional().default([]),
        seoTags: z.array(z.string()).nullable().optional().default([]),
        examCenters: z.array(z.string()).nullable().optional().default([]),
        examPattern: z.any().nullable().optional(),
        skillTests: z.any().nullable().optional(),
        examStages: z.any().nullable().optional(),
        importantDates: z.any().nullable().optional(),
        qualificationDetails: z.any().nullable().optional(),
        physicalStandards: z.any().nullable().optional(),
        extraMetadata: z.any().nullable().optional(),
        feeBreakdown: z.any().nullable().optional(),
        ageRelaxationRules: z.any().nullable().optional(),
        notificationPdfUrl: z.string().url().or(z.string().length(0)).nullable().optional(),
        admitCardUrl: z.string().url().or(z.string().length(0)).nullable().optional(),
        resultUrl: z.string().url().or(z.string().length(0)).nullable().optional(),
        answerKeyUrl: z.string().url().or(z.string().length(0)).nullable().optional(),
        syllabusUrl: z.string().url().or(z.string().length(0)).nullable().optional(),
        previousPapersUrl: z.string().url().or(z.string().length(0)).nullable().optional(),
        vacancyBreakdown: z.any().nullable().optional(),
        governmentLevel: z.string().nullable().optional(),
        vacancyNature: z.string().nullable().optional(),
        applicationStatus: z.string().nullable().optional(),
        jobCategory: z.array(z.string()).nullable().optional(),
        applicationMode: z.string().nullable().optional(),
        officialSourceVerified: z.boolean().nullable().optional(),
        sourceLastCheckedAt: z.string().nullable().optional(),
        extractionConfidence: z.number().nullable().optional(),
        examName: z.string().nullable().optional(),
        notificationIssuedDate: z.string().nullable().optional(),
        basicPay: z.number().int().nonnegative().nullable().optional(),
        payLevel: z.string().nullable().optional(),
        allowances: z.array(z.string()).nullable().optional().default([]),
        categoryVacancies: z.any().nullable().optional(),
        cadreDetails: z.any().nullable().optional(),
        postPreferences: z.any().nullable().optional(),
        serviceBond: z.any().nullable().optional(),
        reservationDetails: z.any().nullable().optional(),
        referenceLinks: z.any().nullable().optional(),
        cutOffMarks: z.any().nullable().optional(),
    }).nullable().optional(),

    // Walk-in specific (Simplified)
    walkInDetails: z.object({
        date: z.string().optional(), // Frontend sends singular date often
        dates: z.array(z.string()).optional(), // Backend expects array
        dateRange: z.string().optional(), // New: "2nd Feb - 6th Feb"
        timeRange: z.string().optional(), // New: "11:00 AM - 1:00 PM"
        venueAddress: z.string().optional(),
        venue: z.string().optional(), // Frontend alias
        venueLink: z.string().optional(), // New: Google Maps URL
        reportingTime: z.string().optional(),
        startTime: z.string().optional(), // Frontend alias for reportingTime
        endTime: z.string().optional(),
        requiredDocuments: z.array(z.string()).optional(),
        contactPerson: z.string().optional(),
        contactPhone: z.string().optional()
    }).optional()
});

export const opportunitySubmitSchema = z.object({
    title: z.string({ error: 'Title is required' }).min(1, 'Title is required'),
    company: z.string({ error: 'Company is required' }).min(1, 'Company is required'),
    companyWebsite: z.string().url().nullable().optional().or(z.string().length(0).nullable().optional()),
    companyLogoUrl: z.string().url().nullable().optional().or(z.string().length(0).nullable().optional()),
    description: z.string().optional().nullable(),
    type: z.nativeEnum(OpportunityType).optional().default(OpportunityType.JOB),
    status: z.nativeEnum(OpportunityStatus).optional().default(OpportunityStatus.DRAFT),
    locations: z.array(z.string()).optional().default([]),
    requiredSkills: z.array(z.string()).optional().default([]),
    skills: z.array(z.string()).optional(), // fallback alias
    allowedDegrees: z.array(z.nativeEnum(EducationLevel)).optional().default([]),
    allowedCourses: z.array(z.string()).optional().default([]),
    allowedSpecializations: z.array(z.string()).optional().default([]),
    allowedPassoutYears: z.array(z.number().int()).optional().default([]),
    workMode: z.nativeEnum(WorkMode).nullable().optional(),
    salaryRange: z.string().nullable().optional(),
    salaryMin: z.number().nullable().optional(),
    salaryMax: z.number().nullable().optional(),
    salaryPeriod: z.nativeEnum(SalaryPeriod).optional().default(SalaryPeriod.YEARLY),
    stipend: z.string().nullable().optional(),
    employmentType: z.string().nullable().optional(),
    applyLink: z.string().url().nullable().optional().or(z.string().length(0).nullable().optional()),
    sourceLink: z.string().url().nullable().optional().or(z.string().length(0).nullable().optional()),
    applicationDetails: applicationDetailsSchema.nullable().optional(),
    
    // Walk-in specific
    dates: z.array(z.string()).optional().default([]),
    dateRange: z.string().optional().nullable(),
    timeRange: z.string().optional().nullable(),
    venueAddress: z.string().optional().nullable(),
    venueLink: z.string().url().or(z.string().length(0)).nullable().optional(),
    reportingTime: z.string().optional().nullable(),
    experienceMin: z.number().nullable().optional(),
    experienceMax: z.number().nullable().optional(),
    structuredLocations: z.any().nullable().optional(),
    jobFunction: z.string().nullable().optional(),
    incentives: z.string().nullable().optional(),
    selectionProcess: z.string().nullable().optional(),
    notesHighlights: z.string().nullable().optional(),
});

// User Action Schemas
export const userActionSchema = z.object({
    actionType: z.nativeEnum(ActionType)
});

export const feedbackSchema = z.object({
    reason: z.nativeEnum(FeedbackReason),
    description: z.string().max(1000).optional()
});

export const appFeedbackSchema = z.object({
    type: z.nativeEnum(AppFeedbackType),
    rating: z.number().int().min(1).max(5).optional(),
    message: z.string().min(10).max(2000),
    pageUrl: z.string().max(500).optional()
});

export const alertPreferencesSchema = z.object({
    enabled: z.boolean().optional(),
    emailEnabled: z.boolean().optional(),
    dailyDigest: z.boolean().optional(),
    closingSoon: z.boolean().optional(),
    minRelevanceScore: z.number().int().min(0).max(100).optional(),
    preferredHour: z.number().int().min(0).max(23).optional(),
    timezone: z.string().min(1).max(64).optional()
});

export const pushSubscriptionSchema = z.object({
    subscription: z.object({
        endpoint: z.string().url('Invalid push subscription endpoint'),
        keys: z.object({
            p256dh: z.string().min(1, 'Missing p256dh key'),
            auth: z.string().min(1, 'Missing auth key'),
        }),
    }),
});

export const usernameSchema = z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-z0-9_]+$/, 'Usernames can only contain lowercase letters, numbers, and underscores');

export const contributionSchema = z.object({
    url: z.string().url('Valid URL is required').optional(),
    referral: z.object({
        contact: z.string().min(1, 'Contact info is required'),
        description: z.string().min(10, 'Description must be at least 10 characters'),
        company: z.string().min(1, 'Company name is required'),
        companyUrl: z.string().url().optional().or(z.string().length(0)),
    }).optional()
}).refine(data => data.url || data.referral, {
    message: "Either a URL or a referral must be provided"
});

// Community schemas (plan 23 §4)
export const commentCreateSchema = z.object({
    text: z.string().trim().min(1, 'Comment text is required').max(500, 'Comment text must be at most 500 characters'),
    commentType: z.nativeEnum(CommentType).optional().default(CommentType.GENERAL),
    parentCommentId: z.string().min(1).max(64).optional(),
});


export const commentVoteSchema = z.object({
    value: z.nativeEnum(CommentVoteValue),
});

export const signalToggleSchema = z.object({
    signalType: z.nativeEnum(JobSignalType),
});

export const submitJobSchema = z.object({
    sourceUrl: z.string().trim().url('A valid source URL is required').max(2000),
    applyUrl: z.string().trim().url('A valid apply URL is required').max(2000).optional(),
    title: z.string().trim().min(1, 'Title is required').max(200),
    company: z.string().trim().max(200).optional(),
    description: z.string().trim().max(20000).optional(),
    // Optional detail fields (progressive disclosure on /contribute)
    companyWebsite: z
        .union([z.string().trim().url('Enter a valid URL'), z.literal('')])
        .optional(),
    companyLogoUrl: z
        .union([z.string().trim().url('Enter a valid URL'), z.literal('')])
        .nullable()
        .optional(),
    type: z.nativeEnum(OpportunityType).optional(),
    locations: z.array(z.string().trim().min(1).max(120)).max(15).optional(),
    workMode: z.nativeEnum(WorkMode).nullable().optional(),
    salaryRange: z.string().trim().max(60).nullable().optional(),
    salaryMin: z.number().int().min(0).nullable().optional(),
    salaryMax: z.number().int().min(0).nullable().optional(),
    salaryPeriod: z.nativeEnum(SalaryPeriod).optional(),
    stipend: z.string().trim().max(120).nullable().optional(),
    employmentType: z.string().trim().max(80).nullable().optional(),
    experienceMin: z.number().min(0).max(30).nullable().optional(),
    experienceMax: z.number().min(0).max(30).nullable().optional(),
    requiredSkills: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
    tags: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
    allowedDegrees: z.array(z.nativeEnum(EducationLevel)).optional(),
    allowedCourses: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
    allowedSpecializations: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
    allowedPassoutYears: z.array(z.number().int().min(1990).max(2100)).max(15).optional(),
    jobFunction: z.string().trim().max(120).nullable().optional(),
    incentives: z.string().trim().max(500).nullable().optional(),
    selectionProcess: z.string().trim().max(5000).nullable().optional(),
    notesHighlights: z.string().trim().max(5000).nullable().optional(),
    expiresAt: z.string().trim().max(64).nullable().optional(),
    applicationDetails: applicationDetailsSchema.nullable().optional(),
    // Walk-in details (only used when type is WALKIN)
    dates: z.array(z.string().trim().min(1).max(64)).max(10).optional(),
    dateRange: z.string().trim().max(120).nullable().optional(),
    timeRange: z.string().trim().max(120).nullable().optional(),
    venueAddress: z.string().trim().max(2000).nullable().optional(),
    venueLink: z.union([z.string().trim().url('Enter a valid URL'), z.literal('')]).nullable().optional(),
    reportingTime: z.string().trim().max(120).nullable().optional(),
    // Guest attribution (optional when not logged in)
    contact: z.string().trim().max(200).nullable().optional(),
    submitterName: z.string().trim().max(120).nullable().optional(),
    // Honeypot - must stay empty
    website: z.string().max(0, 'Invalid submission').optional(),
});

export const ingestJobSchema = opportunitySubmitSchema
    .extend({
        sourceUrl: z.string().trim().url('A valid source URL is required').max(2000).optional(),
        applyUrl: z.string().trim().url('A valid apply URL is required').max(2000).optional(),
        tags: z.array(z.string().trim().min(1).max(60)).max(20).optional().default([]),
        notesHighlights: z.string().trim().max(5000).nullable().optional(),
        idempotencyKey: z.string().trim().min(1).max(128).optional(),
        contact: z.string().trim().max(200).nullable().optional(),
        submitterName: z.string().trim().max(120).nullable().optional(),
    })
    .superRefine((data, ctx) => {
        const source = data.sourceLink || data.sourceUrl;
        const apply = data.applyLink || data.applyUrl;
        if (!source && !apply) {
            ctx.addIssue({ code: 'custom', path: ['sourceLink'], message: 'At least one of sourceLink (or sourceUrl) or applyLink (or applyUrl) is required' });
        }
    });

export type IngestJobInput = z.infer<typeof ingestJobSchema>;

export const reportCreateSchema = z.object({
    reason: z.nativeEnum(ReportReason),
    message: z.string().trim().max(1000).optional(),
});

/**
 * MCP submission schema (plan 23 §9).
 * Anonymous, strictly-typed, no arbitrary-object payload. Every field is
 * validated and length-capped so ChatGPT cannot flood or shape the DB.
 * URL fields are treated as DATA only — the server never fetches them.
 */
export const mcpSubmitOpportunitySchema = z.object({
    title: z.string().trim().min(1, 'title is required').max(200),
    companyName: z.string().trim().min(1, 'companyName is required').max(200),
    jobUrl: z.string().trim().url('jobUrl must be a valid https URL').max(2000)
        .refine((u) => u.startsWith('https://'), 'jobUrl must use https'),
    location: z.string().trim().max(120).optional(),
    employmentType: z.string().trim().max(80).optional(),
    salary: z.string().trim().max(60).optional(),
    description: z.string().trim().max(5000).optional(),
    eligibility: z.string().trim().max(2000).optional(),
    sourceUrl: z.string().trim().url('sourceUrl must be a valid URL').max(2000).optional(),
    contactEmail: z.string().trim().email('contactEmail must be valid').max(200).optional(),
}).superRefine((data, ctx) => {
    if (data.sourceUrl && !data.sourceUrl.startsWith('https://')) {
        ctx.addIssue({ code: 'custom', path: ['sourceUrl'], message: 'sourceUrl must use https' });
    }
    // Never trust the URL as a server-side fetch target — it is stored only.
});

export type McpSubmitOpportunityInput = z.infer<typeof mcpSubmitOpportunitySchema>;

export const notificationReadSchema = z.object({
    ids: z.array(z.string().min(1).max(64)).max(200).optional(),
});

// Community Post vote schema (value must be 1 or -1)
export const communityPostVoteSchema = z.object({
    value: z.number().int().refine((v) => v === 1 || v === -1, {
        message: 'Vote value must be 1 (upvote) or -1 (downvote)',
    }),
});

// Community Post comment create schema
export const communityPostCommentCreateSchema = z.object({
    body: z.string().trim().min(1, 'Comment body is required').max(500, 'Comment must be at most 500 characters'),
    parentId: z.string().min(1).max(64).optional(),
});

// Community Post comment vote schema
export const communityPostCommentVoteSchema = z.object({
    value: z.number().int().refine((v) => v === 1 || v === -1, {
        message: 'Vote value must be 1 (upvote) or -1 (downvote)',
    }),
});

// ============================================================================
// FRESHER NEEDS: Saved searches, referral board, offer transparency
// ============================================================================

export const savedSearchCreateSchema = z.object({
    name: z.string().trim().min(1, 'Name is required').max(100),
    filters: z.object({
        type: z.enum(['JOB', 'INTERNSHIP', 'WALKIN', 'GOVERNMENT']).optional(),
        feedType: z.enum(['all', 'trending', 'remote', 'walkins', 'internships', '2026']).optional(),
        city: z.string().trim().max(80).optional(),
        tag: z.string().trim().max(80).optional(),
        company: z.string().trim().max(120).optional(),
        minSalary: z.number().int().min(0).max(200).optional(),
        maxSalary: z.number().int().min(0).max(200).optional(),
        batch: z.number().int().min(2020).max(2035).optional(),
        closingSoon: z.boolean().optional(),
    }).refine(
        (f) => Object.values(f).some((v) => v !== undefined),
        { message: 'At least one filter is required' }
    ),
    alertEnabled: z.boolean().optional(),
});

export const savedSearchUpdateSchema = z.object({
    name: z.string().trim().min(1).max(100).optional(),
    alertEnabled: z.boolean().optional(),
});

export const referralRequestCreateSchema = z.object({
    company: z.string().trim().min(1, 'Company is required').max(120),
    role: z.string().trim().max(120).optional(),
    batch: z.number().int().min(2020).max(2035).optional(),
    city: z.string().trim().max(80).optional(),
    note: z.string().trim().max(1000).optional(),
});

export const referralResponseCreateSchema = z.object({
    message: z.string().trim().max(1000).optional(),
    contactHandle: z.string().trim().max(200).optional(),
}).refine(
    (d) => (d.message && d.message.length > 0) || (d.contactHandle && d.contactHandle.length > 0),
    { message: 'Include a message or a contact handle' }
);

export const referralRequestStatusSchema = z.object({
    status: z.enum(['OPEN', 'FULFILLED', 'CLOSED']),
});

export const salaryReportCreateSchema = z.object({
    opportunityId: z.string().min(1).max(64).optional(),
    company: z.string().trim().min(1, 'Company is required').max(120),
    role: z.string().trim().min(1, 'Role is required').max(120),
    batch: z.number().int().min(2020).max(2035).optional(),
    city: z.string().trim().max(80).optional(),
    reportType: z.enum(['OFFER', 'CURRENT_CTC']).optional(),
    ctcFixed: z.number().int().min(0).max(100000).optional(),
    ctcVariable: z.number().int().min(0).max(100000).optional(),
    ctcTotal: z.number().int().min(0).max(100000).optional(),
    inHandMonthly: z.number().int().min(0).max(1000000).optional(),
    joinBonus: z.number().int().min(0).max(100000).optional(),
    bondMonths: z.number().int().min(0).max(60).optional(),
    notes: z.string().trim().max(1000).optional(),
});

