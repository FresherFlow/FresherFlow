import { z } from 'zod';
import { OpportunityType, OpportunityStatus, WorkMode, EducationLevel, Availability, ActionType, FeedbackReason, SalaryPeriod, AppFeedbackType } from '@fresherflow/types';

const governmentApplicationFeeSchema = z.object({
    general: z.number().nonnegative().optional(),
    obc: z.number().nonnegative().optional(),
    ews: z.number().nonnegative().optional(),
    sc: z.number().nonnegative().optional(),
    st: z.number().nonnegative().optional(),
    pwd: z.number().nonnegative().optional(),
    female: z.number().nonnegative().optional(),
    other: z.record(z.number().nonnegative()).optional(),
});

const governmentVacancySchema = z.object({
    postName: z.string().min(1),
    total: z.number().int().nonnegative().optional(),
    categoryBreakup: z.record(z.number().int().nonnegative()).optional(),
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

    // PG (Optional)
    pgCourse: z.string().optional(),
    pgSpecialization: z.string().optional(),
    pgYear: z.number().int().min(1000, 'Year must be 4 digits').max(9999, 'Year must be 4 digits').optional()
});

export const preferencesSchema = z.object({
    interestedIn: z.array(z.nativeEnum(OpportunityType)).min(1, 'Select at least one opportunity type'),
    preferredCities: z.array(z.string()).min(1).max(5, 'Select 1-5 cities'),
    workModes: z.array(z.nativeEnum(WorkMode)).min(1, 'Select at least one work mode')
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
