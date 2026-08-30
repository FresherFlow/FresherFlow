// @fresherflow/utils - Opportunity Grouping & Clean Domain Mapping
// Transforms DB Opportunity rows into the clean nested grouped contract
// (Getro-style) and groups a flat list by company.

import type {
    CompanyGroupedItem,
    EducationLevel,
    GroupedGovernmentDetails,
    GroupedOpportunity,
    GroupedWalkInDetails,
    OpportunityStatus,
    OpportunityType,
    WorkMode,
    SalaryPeriod,
} from '@fresherflow/types';
import { LinkHealth } from '@fresherflow/types';
import { slugify } from '../slugify.js';

interface GroupingOpportunityInput {
    id: string;
    slug: string;
    type: GroupedOpportunity['type'];
    status: GroupedOpportunity['status'];
    title: string;
    company: string;
    description?: string | null;
    sourceLink?: string | null;
    applyLink?: string | null;

    companyId?: string | null;
    companyWebsite?: string | null;
    companyLogoUrl?: string | null;
    companyStage?: string | null;
    companySize?: string | null;
    companyIndustry?: string[] | null;
    companyTopics?: string[] | null;

    jobFunction?: string | null;
    employmentType?: string | null;
    workMode?: GroupedOpportunity['workMode'];

    locations?: string[] | null;

    allowedDegrees?: GroupedOpportunity['eligibility']['degrees'] | null;
    allowedCourses?: string[] | null;
    allowedSpecializations?: string[] | null;
    allowedPassoutYears?: number[] | null;
    allowedAvailability?: string | null;
    experienceMin?: number | null;
    experienceMax?: number | null;

    requiredSkills?: string[] | null;
    tags?: string[] | null;

    salaryMin?: number | null;
    salaryMax?: number | null;
    salaryRange?: string | null;
    salaryPeriod?: GroupedOpportunity['salary']['period'];
    stipend?: string | null;
    incentives?: string | null;

    selectionProcess?: string | null;
    notesHighlights?: string | null;
    applicationDetails?: GroupedOpportunity['hiring']['applicationDetails'];

    clicksCount?: number;
    savesCount?: number;
    sharesCount?: number;
    commentsCount?: number;
    trendingScore?: number;

    linkHealth?: GroupedOpportunity['health']['linkHealth'];
    verificationFailures?: number;
    lastVerifiedAt?: Date | string;

    postedByUserId?: string;
    postedAt?: Date | string;
    publishedAt?: Date | string | null;
    expiresAt?: Date | string | null;
    updatedAt?: Date | string;
    deletedAt?: Date | string | null;
    deletionReason?: string | null;

    walkInDetails?: Partial<GroupedWalkInDetails> | null;
    governmentJobDetails?: Partial<GroupedGovernmentDetails> | null;
}

function cleanArray<T>(value: T[] | null | undefined): T[] {
    return Array.isArray(value) ? value.filter((v) => v !== null && v !== undefined && v !== '') : [];
}

function cleanMaybe<T>(value: T | null | undefined): T | undefined {
    return value === null || value === undefined ? undefined : value;
}

/**
 * Derives a company slug from a company name.
 * Uses a shared, deterministic slugifier so grouping is stable across builds.
 */
export function toCompanySlug(companyName: string | null | undefined): string {
    if (!companyName) return '';
    return slugify(companyName);
}

/**
 * Maps a single flat DB opportunity row into the clean nested GroupedOpportunity
 * contract. Strips null / undefined / empty arrays and renames the "allowed"
 * prefixed fields into the nested eligibility shape.
 */
export function toGroupedOpportunity(raw: GroupingOpportunityInput): GroupedOpportunity {
    const companyName = raw.company || '';
    const companySlug = toCompanySlug(companyName);

    const grouped: GroupedOpportunity = {
        id: raw.id,
        slug: raw.slug,
        type: raw.type,
        status: raw.status,
        title: raw.title,
        description: cleanMaybe(raw.description),
        sourceLink: cleanMaybe(raw.sourceLink),
        applyLink: cleanMaybe(raw.applyLink),

        company: {
            id: cleanMaybe(raw.companyId),
            name: companyName,
            slug: companySlug,
            website: cleanMaybe(raw.companyWebsite),
            logoUrl: cleanMaybe(raw.companyLogoUrl),
            stage: cleanMaybe(raw.companyStage),
            size: cleanMaybe(raw.companySize),
            industryTags: cleanArray(raw.companyIndustry),
            topics: cleanArray(raw.companyTopics),
        },

        jobFunction: cleanMaybe(raw.jobFunction),
        employmentType: cleanMaybe(raw.employmentType),
        workMode: cleanMaybe(raw.workMode),
        locations: cleanArray(raw.locations),

        eligibility: {
            experienceMin: cleanMaybe(raw.experienceMin),
            experienceMax: cleanMaybe(raw.experienceMax),
            degrees: cleanArray(raw.allowedDegrees),
            courses: cleanArray(raw.allowedCourses),
            specializations: cleanArray(raw.allowedSpecializations),
            batches: cleanArray(raw.allowedPassoutYears),
            availability: cleanMaybe(raw.allowedAvailability),
        },

        skills: {
            required: cleanArray(raw.requiredSkills),
            tags: cleanArray(raw.tags),
        },

        salary: {
            min: cleanMaybe(raw.salaryMin),
            max: cleanMaybe(raw.salaryMax),
            range: cleanMaybe(raw.salaryRange),
            period: cleanMaybe(raw.salaryPeriod),
            stipend: cleanMaybe(raw.stipend),
            incentives: cleanMaybe(raw.incentives),
        },

        hiring: {
            selectionProcess: cleanMaybe(raw.selectionProcess),
            notesHighlights: cleanMaybe(raw.notesHighlights),
            applicationDetails: cleanMaybe(raw.applicationDetails),
        },

        metrics: {
            clicks: raw.clicksCount ?? 0,
            saves: raw.savesCount ?? 0,
            shares: raw.sharesCount ?? 0,
            comments: raw.commentsCount ?? 0,
            trendingScore: raw.trendingScore ?? 0,
        },

        health: {
            linkHealth: raw.linkHealth ?? LinkHealth.HEALTHY,
            verificationFailures: raw.verificationFailures ?? 0,
            lastVerifiedAt: raw.lastVerifiedAt ?? raw.postedAt ?? new Date(),
        },

        lifecycle: {
            postedByUserId: raw.postedByUserId ?? '',
            postedAt: raw.postedAt ?? new Date(),
            publishedAt: cleanMaybe(raw.publishedAt),
            expiresAt: cleanMaybe(raw.expiresAt),
            updatedAt: cleanMaybe(raw.updatedAt),
            deletedAt: cleanMaybe(raw.deletedAt),
            deletionReason: cleanMaybe(raw.deletionReason),
        },

        walkin: cleanSubSpec(raw.walkInDetails),
        govt: cleanGovtSubSpec(raw.governmentJobDetails),
    };

    return grouped;
}

function cleanSubSpec(walkin: Partial<GroupedWalkInDetails> | null | undefined): GroupedWalkInDetails | null | undefined {
    if (!walkin) return null;
    const cleaned: GroupedWalkInDetails = {};
    if (walkin.dates?.length) cleaned.dates = walkin.dates;
    if (walkin.dateRange) cleaned.dateRange = walkin.dateRange;
    if (walkin.timeRange) cleaned.timeRange = walkin.timeRange;
    if (walkin.venueAddress) cleaned.venueAddress = walkin.venueAddress;
    if (walkin.venueLink) cleaned.venueLink = walkin.venueLink;
    if (walkin.latitude !== undefined && walkin.latitude !== null) cleaned.latitude = walkin.latitude;
    if (walkin.longitude !== undefined && walkin.longitude !== null) cleaned.longitude = walkin.longitude;
    if (walkin.clusterName) cleaned.clusterName = walkin.clusterName;
    if (walkin.city) cleaned.city = walkin.city;
    if (walkin.reportingTime) cleaned.reportingTime = walkin.reportingTime;
    if (walkin.expiryDate) cleaned.expiryDate = walkin.expiryDate;
    if (walkin.landmark) cleaned.landmark = walkin.landmark;
    if (walkin.transitInfo) cleaned.transitInfo = walkin.transitInfo;
    if (walkin.selectionProcess) cleaned.selectionProcess = walkin.selectionProcess;
    if (walkin.requiredDocuments?.length) cleaned.requiredDocuments = walkin.requiredDocuments;
    if (walkin.contactPerson) cleaned.contactPerson = walkin.contactPerson;
    if (walkin.contactPhone) cleaned.contactPhone = walkin.contactPhone;
    return Object.keys(cleaned).length > 0 ? cleaned : null;
}

function cleanGovtSubSpec(govt: Partial<GroupedGovernmentDetails> | null | undefined): GroupedGovernmentDetails | null | undefined {
    if (!govt) return null;
    const cleaned: GroupedGovernmentDetails = {};
    const copy = [
        'department', 'organization', 'recruitingBody', 'governmentLevel', 'jobCategory',
        'examName', 'postName', 'vacancyCount', 'vacancyBreakdown', 'vacancies', 'payLevel',
        'payScale', 'basicPay', 'applicationFee', 'ageMin', 'ageMax', 'ageRelaxation',
        'applicationStartDate', 'applicationEndDate', 'examDate', 'admitCardUrl', 'resultUrl',
        'notificationPdfUrl',
    ] as const;
    for (const key of copy) {
        const value = (govt as Record<string, unknown>)[key];
        if (value === null || value === undefined) continue;
        if (Array.isArray(value) && value.length === 0) continue;
        if (value === '') continue;
        (cleaned as Record<string, unknown>)[key] = value;
    }
    return Object.keys(cleaned).length > 0 ? cleaned : null;
}

/**
 * Groups a list of already-mapped GroupedOpportunities by company slug.
 * Computes per-company opportunity count and aggregates display metadata.
 */
export function groupOpportunitiesByCompany(
    opportunities: GroupedOpportunity[]
): CompanyGroupedItem[] {
    const grouped = new Map<string, CompanyGroupedItem>();

    for (const opp of opportunities) {
        const company = opp.company;
        const key = company.slug || opp.company.name;

        let entry = grouped.get(key);
        if (!entry) {
            entry = {
                id: cleanMaybe(company.id),
                name: company.name,
                slug: company.slug,
                website: cleanMaybe(company.website),
                logoUrl: cleanMaybe(company.logoUrl),
                stage: cleanMaybe(company.stage),
                size: cleanMaybe(company.size),
                industryTags: cleanArray(company.industryTags),
                topics: cleanArray(company.topics),
                opportunityCount: 0,
                opportunities: [],
            };
            grouped.set(key, entry);
        }

        // Merge enrichment from the first seen company record
        if (!entry.website && company.website) entry.website = company.website;
        if (!entry.logoUrl && company.logoUrl) entry.logoUrl = company.logoUrl;
        if (!entry.stage && company.stage) entry.stage = company.stage;
        if (!entry.size && company.size) entry.size = company.size;
        entry.industryTags = mergeUnique(entry.industryTags, company.industryTags);
        entry.topics = mergeUnique(entry.topics, company.topics);

        entry.opportunities.push(opp);
        entry.opportunityCount++;
    }

    return Array.from(grouped.values()).map((item) => ({
        ...item,
        opportunities: item.opportunities,
    }));
}

function mergeUnique(target: string[], source: string[]): string[] {
    const seen = new Set(target);
    const out = [...target];
    for (const value of source) {
        if (!seen.has(value)) {
            seen.add(value);
            out.push(value);
        }
    }
    return out;
}
