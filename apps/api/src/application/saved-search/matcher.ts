/**
 * Phase 7 — saved-search matcher (application layer, pure + where-builder).
 *
 * One matcher for personal queries. Search, feed, and saved-search execution
 * share filter semantics through `parseOpportunityFilters`; this module covers
 * the legacy `SavedSearchFilters` shape stored in `SavedSearch.filters` (a
 * serialized combo, not the full Phase 6 dimension set) so a saved search
 * filters identically to the live search that created it.
 *
 * Rooms NEVER use this matcher (community, not personal matching).
 */

import type { Prisma } from '@fresherflow/database';
import { EmploymentType, OpportunityStatus, RecruitmentMethod } from '@fresherflow/database';
import type { SavedSearchFilters } from '@fresherflow/types';

export interface MatchableOpportunity {
    id: string;
    company: string;
    locations: string[];
    tags?: string[] | null;
    requiredSkills?: string[] | null;
    allowedPassoutYears: number[];
    salaryMin?: number | null;
    salaryMax?: number | null;
    expiresAt?: Date | string | null;
    category?: string | null;
    employmentTypes?: string[] | null;
    recruitmentMethod?: string | null;
    workMode?: string | null;
    institutionIds?: string[];
}

function asDate(value: Date | string | null | undefined): Date | null {
    if (!value) return null;
    const d = value instanceof Date ? value : new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

function norm(value: string): string {
    return value.trim().toLowerCase();
}

/**
 * Pure predicate: does one opportunity satisfy one saved search?
 * Guards input length before any string work (CodeQL ReDoS hygiene).
 */
export function doesOpportunityMatchFilters(
    opportunity: MatchableOpportunity,
    filters: SavedSearchFilters
): boolean {
    if (filters.company && filters.company.length <= 120) {
        if (norm(opportunity.company) !== norm(filters.company)) return false;
    }

    if (filters.city && filters.city.length <= 80) {
        const want = norm(filters.city);
        const locations = (opportunity.locations ?? []).map(norm);
        if (!locations.includes(want)) return false;
    }

    if (filters.tag && filters.tag.length <= 80) {
        const want = norm(filters.tag);
        const tags = [...(opportunity.tags ?? []), ...(opportunity.requiredSkills ?? [])].map(norm);
        if (!tags.includes(want)) return false;
    }

    if (filters.batch !== undefined) {
        if (!opportunity.allowedPassoutYears.includes(filters.batch)) return false;
    }

    if (filters.minSalary !== undefined && filters.minSalary !== null) {
        const ceiling = opportunity.salaryMax ?? opportunity.salaryMin ?? null;
        // Undisclosed salary never excludes (matches search semantics).
        if (ceiling !== null && ceiling < filters.minSalary) return false;
    }

    if (filters.maxSalary !== undefined && filters.maxSalary !== null) {
        const floor = opportunity.salaryMin ?? null;
        if (floor !== null && floor > filters.maxSalary) return false;
    }

    if (filters.type) {
        const legacy = norm(filters.type);
        if (legacy === 'job' && opportunity.category !== 'EMPLOYMENT') return false;
        if (legacy === 'internship') {
            const types = opportunity.employmentTypes ?? [];
            if (opportunity.category !== 'EMPLOYMENT' || !types.includes('INTERNSHIP')) return false;
        }
        if (legacy === 'walkin' && opportunity.recruitmentMethod !== 'WALK_IN') return false;
        if (legacy === 'government' && opportunity.category !== 'GOVERNMENT') return false;
    }

    if (filters.feedType) {
        const feed = norm(filters.feedType);
        if (feed === 'walkins' && opportunity.recruitmentMethod !== 'WALK_IN') return false;
        if (feed === 'internships') {
            const types = opportunity.employmentTypes ?? [];
            if (!types.includes('INTERNSHIP')) return false;
        }
        if (feed === 'remote' && (opportunity.workMode ?? '').toUpperCase() !== 'REMOTE') return false;
        if (feed === '2026' && !opportunity.allowedPassoutYears.includes(2026)) return false;
    }

    if (filters.closingSoon) {
        const expires = asDate(opportunity.expiresAt);
        if (!expires) return false;
        const hoursLeft = (expires.getTime() - Date.now()) / 3_600_000;
        if (hoursLeft <= 0 || hoursLeft > 72) return false;
    }

    return true;
}

/**
 * Prisma where-builder for saved-search execution. Mirrors the predicate above
 * and the feed route's where-clause for the core dimensions, so execution,
 * counting, and alerting cannot drift apart.
 */
export function buildSavedSearchWhere(
    filters: SavedSearchFilters,
    since?: Date
): Prisma.OpportunityWhereInput {
    const andConditions: Prisma.OpportunityWhereInput[] = [];

    if (filters.type) {
        const legacy = filters.type.trim().toLowerCase();
        if (legacy === 'job') andConditions.push({ category: 'EMPLOYMENT' as never });
        else if (legacy === 'internship') {
            andConditions.push({ category: 'EMPLOYMENT' as never });
            andConditions.push({ employmentTypes: { has: EmploymentType.INTERNSHIP } });
        } else if (legacy === 'walkin') {
            andConditions.push({ recruitmentMethod: RecruitmentMethod.WALK_IN });
        }
    } else if (filters.feedType === 'walkins') {
        andConditions.push({ recruitmentMethod: RecruitmentMethod.WALK_IN });
    } else if (filters.feedType === 'internships') {
        andConditions.push({ employmentTypes: { has: EmploymentType.INTERNSHIP } });
    }

    if (filters.feedType === 'remote') andConditions.push({ workMode: 'REMOTE' as never });
    if (filters.feedType === '2026') andConditions.push({ allowedPassoutYears: { has: 2026 } });

    if (filters.city) andConditions.push({ locations: { has: filters.city } });
    if (filters.tag) andConditions.push({ tags: { has: filters.tag } });
    if (filters.company) andConditions.push({ company: { equals: filters.company, mode: 'insensitive' } });
    if (filters.batch) andConditions.push({ allowedPassoutYears: { has: filters.batch } });
    if (filters.minSalary != null) {
        andConditions.push({
            OR: [{ salaryMin: { gte: filters.minSalary } }, { salaryMax: { gte: filters.minSalary } }],
        });
    }
    if (filters.maxSalary != null) andConditions.push({ salaryMin: { lte: filters.maxSalary } });
    if (filters.closingSoon) {
        andConditions.push({ expiresAt: { lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) } });
    }

    return {
        status: OpportunityStatus.PUBLISHED,
        deletedAt: null,
        ...(since ? { postedAt: { gte: since } } : {}),
        AND: andConditions,
    };
}

/**
 * Institution overlap: a saved search with linked institutions only matches
 * opportunities targeting at least one of the same institutions. A search with
 * no linked institutions matches any opportunity (no campus constraint).
 */
export function hasInstitutionOverlap(
    searchInstitutionIds: string[],
    opportunityInstitutionIds: string[]
): boolean {
    if (searchInstitutionIds.length === 0) return true;
    const opp = new Set(opportunityInstitutionIds);
    return searchInstitutionIds.some((id) => opp.has(id));
}

/** Campus-drive kinds use institution targeting; everything else is NEW_JOB. */
export function selectAlertKindForMatch(opportunity: {
    recruitmentMethod?: string | null;
    institutionIds?: string[];
}): 'CAMPUS_DRIVE' | 'NEW_JOB' {
    const method = (opportunity.recruitmentMethod ?? '').toUpperCase();
    const isCampus = method === 'ON_CAMPUS' || method === 'POOL_CAMPUS' || method === 'WALK_IN';
    if (isCampus && (opportunity.institutionIds ?? []).length > 0) return 'CAMPUS_DRIVE';
    return 'NEW_JOB';
}
