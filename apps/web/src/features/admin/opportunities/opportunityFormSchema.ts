import { z } from 'zod';

/**
 * Canonical shape of the admin opportunity form.
 *
 * Today this is the documented field list + defaults (the live store is still
 * `useOpportunityForm`'s individual states). The migration target is
 * `useForm<OpportunityFormData>({ resolver: zodResolver(...) })` with sections
 * reading via `useFormContext` — at that point this schema becomes the single
 * validation + default source and the drilled props disappear entirely.
 */

const optionalText = z.string().default('');

export const opportunityTypeSchema = z.enum(['JOB', 'INTERNSHIP', 'WALKIN', 'GOVERNMENT']);
export const workModeSchema = z.enum(['ONSITE', 'HYBRID', 'REMOTE']);
export const salaryPeriodSchema = z.enum(['YEARLY', 'MONTHLY']);
export const appMethodSchema = z.enum(['DIRECT', 'FORM', 'ASSESSMENT']);

export const opportunityFormSchema = z
    .object({
        type: opportunityTypeSchema.default('JOB'),
        title: z.string().min(1, 'Title is required').default(''),
        company: z.string().min(1, 'Company is required').default(''),
        companyWebsite: optionalText,
        companyLogoUrl: optionalText,
        description: optionalText,
        customSlug: optionalText,
        jobFunction: optionalText,
        employmentType: optionalText,
        incentives: optionalText,
        selectionProcess: optionalText,
        notesHighlights: optionalText,

        // Eligibility
        allowedDegrees: z.array(z.string()).default([]),
        allowedCourses: z.array(z.string()).default([]),
        allowedSpecializations: z.array(z.string()).default([]),
        experienceMin: optionalText,
        experienceMax: optionalText,
        passoutYears: z.array(z.number()).default([]),
        passoutYearMin: optionalText,
        passoutYearMax: optionalText,
        allowedAvailability: optionalText,
        requiredSkills: optionalText,

        // Logistics & compensation
        locations: optionalText,
        workMode: workModeSchema.default('ONSITE'),
        salaryRange: optionalText,
        salaryAmount: optionalText,
        salaryPeriod: salaryPeriodSchema.default('YEARLY'),
        stipend: optionalText,

        // Links & expiry
        sourceLink: optionalText,
        applyLink: optionalText,
        expiryDate: optionalText,
        expiryTime: optionalText,

        // Application complexity
        appMethod: appMethodSchema.default('DIRECT'),
        appPlatform: optionalText,
        appDuration: optionalText,
        appRequiredItems: z.array(z.string()).default([]),

        // Walk-in
        startDate: optionalText,
        endDate: optionalText,
        startTime: optionalText,
        endTime: optionalText,
        venueAddress: optionalText,
        walkInDateRange: optionalText,
        walkInTimeRange: optionalText,
        venueLink: optionalText,
        requiredDocuments: optionalText,
        contactPerson: optionalText,
        contactPhone: optionalText,

        // Government
        governmentTags: optionalText,
        governmentDepartment: optionalText,
        governmentOrganization: optionalText,
        recruitingBody: optionalText,
        examName: optionalText,
        postName: optionalText,
        advertisementNumber: optionalText,
        applicationStatus: z.string().default('OPEN'),
        governmentLevel: z.string().default('CENTRAL'),
        vacancyNature: optionalText,
        jobCategory: optionalText,
        govtCategory: optionalText,
        basicPay: optionalText,
        payLevel: optionalText,
        allowances: optionalText,
        officialWebsiteUrl: optionalText,
        officialNotificationUrl: optionalText,
        notificationPdfUrl: optionalText,
        notificationIssuedDate: optionalText,
        applicationMode: optionalText,
        applicationStartDate: optionalText,
        applicationEndDate: optionalText,
        vacancyCount: optionalText,
        vacancyBreakdownJson: optionalText,
        categoryVacanciesJson: optionalText,
        cadreDetailsJson: optionalText,
        postPreferencesJson: optionalText,
        serviceBondJson: optionalText,
        applicationFee: optionalText,
        applicationFeeJson: optionalText,
        feeBreakdownJson: optionalText,
        ageMin: optionalText,
        ageMax: optionalText,
        ageRelaxation: optionalText,
        ageRelaxationRulesJson: optionalText,
        eligibilityDetailsJson: optionalText,
        qualificationDetailsJson: optionalText,
        physicalStandardsJson: optionalText,
        reservationNotes: optionalText,
        reservationDetailsJson: optionalText,
        importantInstructions: optionalText,
        examDate: optionalText,
        examDatesJson: optionalText,
        examPatternJson: optionalText,
        skillTestsJson: optionalText,
        examStagesJson: optionalText,
        examCenters: optionalText,
        importantDatesJson: optionalText,
        admitCardDate: optionalText,
        admitCardUrl: optionalText,
        resultDate: optionalText,
        resultUrl: optionalText,
        answerKeyUrl: optionalText,
        syllabusUrl: optionalText,
        previousPapersUrl: optionalText,
        selectionStages: optionalText,
        governmentRequiredDocuments: optionalText,
        governmentRequiredDocumentsJson: optionalText,
        cutOffMarksJson: optionalText,
        referenceLinksJson: optionalText,
        extraMetadataJson: optionalText,
        officialSourceVerified: z.boolean().default(false),
        sourceLastCheckedAt: optionalText,
        extractionConfidence: optionalText,
    })
    // Mirrors the existing submit gate: walk-ins don't need URLs, everything
    // else needs at least one of source / apply.
    .refine(
        (values) =>
            values.type === 'WALKIN' ||
            values.sourceLink.trim().length > 0 ||
            values.applyLink.trim().length > 0,
        {
            message: 'At least one of Source URL or Apply URL is required.',
            path: ['applyLink'],
        }
    );

export type OpportunityFormData = z.infer<typeof opportunityFormSchema>;

export const opportunityFormDefaults: OpportunityFormData =
    opportunityFormSchema.parse({});
