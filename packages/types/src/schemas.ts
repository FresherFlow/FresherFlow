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
    SalaryPeriod,
    OrganizationType,
    OrgRole
} from './enums.js';

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
    diplomaCollege: z.string().optional(),
    diplomaCourse: z.string().optional(),
    diplomaYear: z.number().int().optional(),
    degreeCollege: z.string().optional(),
    degreeCourse: z.string().optional(),
    degreeSpecialization: z.string().optional(),
    degreeYear: z.number().int().optional(),
    degreeCgpa: z.number().min(0).max(10).optional(),
    pgCollege: z.string().optional(),
    pgCourse: z.string().optional(),
    pgSpecialization: z.string().optional(),
    pgYear: z.number().int().optional(),
    pgCgpa: z.number().min(0).max(10).optional()
});

export const preferencesSchema = z.object({
    preferredLocations: z.array(z.string()).min(1, 'Select at least one location'),
    skills: z.array(z.string()).min(1, 'Add at least one skill'),
    workMode: z.nativeEnum(WorkMode).optional(),
    availability: z.nativeEnum(Availability).optional(),
    minSalary: z.number().positive().optional()
});

// ========================================
// OPPORTUNITY SCHEMAS
// ========================================

export const walkInDetailsSchema = z.object({
    dates: z.array(z.union([z.string(), z.date()])).optional().default([]),
    dateRange: z.string().optional(),
    timeRange: z.string().optional(),
    venueAddress: z.string().min(5, 'Venue address is required for walk-in drives'),
    venueLink: z.string().url().optional().or(z.literal('')),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    clusterName: z.string().optional(),
    city: z.string().optional(),
    reportingTime: z.string().optional().default('9:30 AM'),
    requiredDocuments: z.array(z.string()).default([]),
    contactPerson: z.string().optional(),
    contactPhone: z.string().optional(),
});

export const createOpportunitySchema = z.object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(150),
    company: z.string().min(2, 'Company name must be at least 2 characters').max(100),
    companyLogoUrl: z.string().url().optional().or(z.literal('')),
    type: z.nativeEnum(OpportunityType),
    workMode: z.nativeEnum(WorkMode).optional().default(WorkMode.ONSITE),
    locations: z.array(z.string()).min(1, 'At least one location is required'),
    salaryRange: z.string().optional(),
    salaryAmount: z.string().optional(),
    salaryPeriod: z.nativeEnum(SalaryPeriod).optional(),
    experienceMin: z.number().min(0).max(3).default(0),
    experienceMax: z.number().min(0).max(5).default(0),
    allowedDegrees: z.array(z.nativeEnum(EducationLevel)).default([]),
    allowedCourses: z.array(z.string()).default([]),
    allowedSpecializations: z.array(z.string()).default([]),
    allowedPassoutYears: z.array(z.number().int()).default([]),
    requiredSkills: z.array(z.string()).default([]),
    description: z.string().min(20, 'Description must be at least 20 characters'),
    selectionProcess: z.string().optional(),
    incentives: z.string().optional(),
    notesHighlights: z.string().optional(),
    applyLink: z.string().url().optional().or(z.literal('')),
    sourceLink: z.string().url().optional().or(z.literal('')),
    expiresAt: z.string().datetime().optional(),
    walkInDetails: walkInDetailsSchema.optional(),
});

export const updateOpportunitySchema = createOpportunitySchema.partial().extend({
    status: z.nativeEnum(OpportunityStatus).optional()
});

export const reportOpportunitySchema = z.object({
    reason: z.nativeEnum(FeedbackReason),
    details: z.string().max(500).optional()
});

export const trackActionSchema = z.object({
    opportunityId: z.string().uuid(),
    actionType: z.nativeEnum(ActionType)
});

export const appFeedbackSchema = z.object({
    type: z.nativeEnum(AppFeedbackType),
    rating: z.number().int().min(1).max(5).optional(),
    message: z.string().min(3, 'Feedback must be at least 3 characters').max(1000),
    email: z.string().email().optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
});

export const createOrganizationSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    type: z.nativeEnum(OrganizationType),
    website: z.string().url().optional(),
    logoUrl: z.string().url().optional(),
    description: z.string().max(500).optional()
});

export const updateOrganizationMemberSchema = z.object({
    role: z.nativeEnum(OrgRole),
    title: z.string().max(100).optional()
});

export const inviteOrganizationMemberSchema = z.object({
    email: z.string().email('Invalid email address'),
    role: z.nativeEnum(OrgRole),
    title: z.string().max(100).optional()
});
