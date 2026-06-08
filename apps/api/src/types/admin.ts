/* eslint-disable @typescript-eslint/no-explicit-any */
import { OpportunityType, OpportunityStatus, EducationLevel, WorkMode, SalaryPeriod } from '@fresherflow/types';
import type {
    GovernmentApplicationFee,
    GovernmentEligibilityDetails,
    GovernmentExamDates,
    GovernmentRequiredDocument,
    GovernmentVacancy,
} from '@fresherflow/types';

export interface AdminOpportunityRequest {
    startDate?: string;
    endDate?: string;
    type?: OpportunityType;
    status?: OpportunityStatus;
    category?: 'job' | 'internship' | 'walk-in';
    title: string;
    company: string;
    customSlug?: string;           // If provided, used as-is (sanitized) instead of auto-generating
    companyWebsite?: string;
    description?: string;
    allowedDegrees?: EducationLevel[];
    allowedCourses?: string[];
    allowedSpecializations?: string[];
    allowedPassoutYears?: number[];
    requiredSkills?: string[];
    locations: string[];
    workMode?: WorkMode;
    salaryMin?: number;
    salaryMax?: number;
    salaryRange?: string;
    stipend?: string;
    salaryPeriod?: SalaryPeriod;
    incentives?: string;
    jobFunction?: string;
    selectionProcess?: string;
    notesHighlights?: string;
    experienceMin?: number;
    experienceMax?: number;
    employmentType?: string;
    tags?: string[];
    sourceLink?: string;
    applyLink?: string;
    expiresAt?: string;
    governmentJobDetails?: {
        department?: string;
        organization?: string;
        recruitingBody?: string;
        officialWebsiteUrl?: string;
        officialNotificationUrl?: string;
        advertisementNumber?: string;
        postName?: string;
        applicationModes?: string[];
        vacancyCount?: number;
        vacancies?: GovernmentVacancy[];
        applicationFee?: string;
        applicationFeeDetails?: GovernmentApplicationFee;
        ageMin?: number;
        ageMax?: number;
        ageRelaxation?: string;
        eligibilityDetails?: GovernmentEligibilityDetails;
        reservationNotes?: string;
        importantInstructions?: string;
        applicationStartDate?: string;
        applicationEndDate?: string;
        examDate?: string;
        examDates?: GovernmentExamDates;
        admitCardDate?: string;
        resultDate?: string;
        selectionStages?: string[];
        requiredDocuments?: string[];
        requiredDocumentDetails?: GovernmentRequiredDocument[];
        seoTags?: string[];
        examCenters?: string[];
        examPattern?: any;
        skillTests?: any;
        examStages?: any;
        importantDates?: any;
        qualificationDetails?: any;
        physicalStandards?: any;
        extraMetadata?: any;
        feeBreakdown?: any;
        ageRelaxationRules?: any;
        governmentLevel?: string;
        vacancyNature?: string;
        applicationStatus?: string;
        jobCategory?: string[];
        applicationMode?: string;
        notificationPdfUrl?: string;
        admitCardUrl?: string;
        resultUrl?: string;
        answerKeyUrl?: string;
        syllabusUrl?: string;
        previousPapersUrl?: string;
        vacancyBreakdown?: any;
        categoryVacancies?: any;
        cadreDetails?: any;
        postPreferences?: any;
        serviceBond?: any;
        reservationDetails?: any;
        referenceLinks?: any;
        cutOffMarks?: any;
        examName?: string;
        notificationIssuedDate?: string;
        basicPay?: number;
        payLevel?: string;
        allowances?: string[];
    } | null;
    walkInDetails?: {
        date?: string;
        dates?: string[];
        dateRange?: string;
        timeRange?: string;
        venueAddress?: string;
        venue?: string;
        venueLink?: string;
        reportingTime?: string;
        startTime?: string;
        endTime?: string;
        requiredDocuments?: string[];
        contactPerson?: string;
        contactPhone?: string;
    };
}
