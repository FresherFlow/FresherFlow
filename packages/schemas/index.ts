// Shared Zod Validation Schemas - Single Source of Truth
// Both API and Web can use these for validation
// This package NEVER imports from apps

import { z } from 'zod';
import {
    OpportunityType,
    OpportunityStatus,
    EducationLevel,
    WorkMode,
    Availability,
    ActionType,
    FeedbackReason,
    AppFeedbackType,
    SalaryPeriod
} from '@fresherflow/types';

// ========================================
// AUTH SCHEMAS
// ========================================

export const registerSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    fullName: z.string().min(2, 'Name must be at least 2 characters')
});

export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required')
});

export const sendOtpSchema = z.object({
    email: z.string().email('Invalid email format')
});

export const verifyOtpSchema = z.object({
    email: z.string().email('Invalid email format'),
    code: z.string().length(6, 'Verification code must be 6 digits')
});

export const usernameSchema = z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-z0-9_]+$/, 'Username must be lowercase, alphanumeric, or underscore');

export const claimUsernameSchema = z.object({
    username: usernameSchema
});

// ========================================
// PROFILE SCHEMAS
// ========================================

export const educationSchema = z.object({
    educationLevel: z.nativeEnum(EducationLevel),
    tenthYear: z.number().int().min(1000).max(9999),
    twelfthYear: z.number().int().min(1000).max(9999),
    gradCourse: z.string().min(1, 'Course is required'),
    gradSpecialization: z.string().min(1, 'Specialization is required'),
    gradYear: z.number().int().min(1000).max(9999),
    pgCourse: z.string().optional(),
    pgSpecialization: z.string().optional(),
    pgYear: z.number().int().min(1000).max(9999).optional()
});

export const preferencesSchema = z.object({
    interestedIn: z.array(z.nativeEnum(OpportunityType))
        .min(1, 'Select at least one opportunity type'),
    preferredCities: z.array(z.string())
        .min(1).max(5),
    workModes: z.array(z.nativeEnum(WorkMode))
        .min(1, 'Select at least one work mode')
});

export const readinessSchema = z.object({
    availability: z.nativeEnum(Availability),
    skills: z.array(z.string())
        .min(1, 'Add at least one skill')
});

// ========================================
// OPPORTUNITY SCHEMAS
// ========================================

export const walkInDetailsSchema = z.object({
    dates: z.array(z.string()).optional(),
    dateRange: z.string().optional(),
    timeRange: z.string().optional(),
    venueAddress: z.string().optional(),
    venueLink: z.string().optional(),
    reportingTime: z.string().optional(),
    requiredDocuments: z.array(z.string()).optional(),
    contactPerson: z.string().optional(),
    contactPhone: z.string().optional()
});

export const applicationDetailsSchema = z.object({
    method: z.enum(['DIRECT', 'FORM', 'ASSESSMENT']).optional(),
    platform: z.string().optional(),
    estimatedMinutes: z.number().int().positive().optional(),
    requiredItems: z.array(z.string()).optional()
});

export const opportunitySchema = z.object({
    type: z.nativeEnum(OpportunityType).optional(),
    status: z.nativeEnum(OpportunityStatus).optional(),
    title: z.string().min(1, 'Title is required'),
    company: z.string().min(1, 'Company name is required'),
    companyWebsite: z.string().url().optional(),
    description: z.string().min(10, 'Description is required'),

    allowedDegrees: z.array(z.nativeEnum(EducationLevel)).default([]),
    allowedCourses: z.array(z.string()).default([]),
    allowedSpecializations: z.array(z.string()).default([]),
    allowedPassoutYears: z.array(z.number()).default([]),
    requiredSkills: z.array(z.string()).default([]),

    locations: z.array(z.string()).default([]),
    workMode: z.nativeEnum(WorkMode).optional(),

    salaryMin: z.number().optional(),
    salaryMax: z.number().optional(),
    salaryRange: z.string().optional(),
    salaryPeriod: z.nativeEnum(SalaryPeriod).default(SalaryPeriod.YEARLY),
    stipend: z.string().optional(),
    experienceMin: z.number().optional(),
    experienceMax: z.number().optional(),

    sourceLink: z.string().url().optional().or(z.string().length(0)),
    applyLink: z.string().url().optional().or(z.string().length(0)),
    expiresAt: z.string().optional(),

    walkInDetails: walkInDetailsSchema.optional(),
    applicationDetails: applicationDetailsSchema.optional().nullable()
});

// ========================================
// USER ACTION SCHEMAS
// ========================================

export const trackActionSchema = z.object({
    actionType: z.nativeEnum(ActionType)
});

export const submitFeedbackSchema = z.object({
    reason: z.nativeEnum(FeedbackReason)
});

export const appFeedbackSchema = z.object({
    type: z.nativeEnum(AppFeedbackType),
    rating: z.number().int().min(1).max(5).optional(),
    message: z.string().min(10).max(2000),
    pageUrl: z.string().max(500).optional()
});

// ========================================
// FILTER SCHEMAS
// ========================================

export const opportunityFiltersSchema = z.object({
    type: z.nativeEnum(OpportunityType).optional(),
    city: z.string().optional(),
    closingSoon: z.boolean().optional()
});

export const adminOpportunityFiltersSchema = z.object({
    type: z.nativeEnum(OpportunityType).optional(),
    status: z.nativeEnum(OpportunityStatus).optional()
});

// ========================================
// TYPE EXPORTS (for TypeScript inference)
// ========================================

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type EducationInput = z.infer<typeof educationSchema>;
export type PreferencesInput = z.infer<typeof preferencesSchema>;
export type ReadinessInput = z.infer<typeof readinessSchema>;
export type OpportunityInput = z.infer<typeof opportunitySchema>;
export type ApplicationDetailsInput = z.infer<typeof applicationDetailsSchema>;
export type TrackActionInput = z.infer<typeof trackActionSchema>;
export type SubmitFeedbackInput = z.infer<typeof submitFeedbackSchema>;
export type AppFeedbackInput = z.infer<typeof appFeedbackSchema>;
export type OpportunityFiltersInput = z.infer<typeof opportunityFiltersSchema>;
export type AdminOpportunityFiltersInput = z.infer<typeof adminOpportunityFiltersSchema>;
export type UsernameInput = z.infer<typeof claimUsernameSchema>;
