/**
 * Phase 7 — saved-search execution → alert generation.
 *
 * Gate: a user creates a SavedSearch, a matching opportunity appears, exactly
 * one intended notification is delivered, and duplicates are prevented.
 *
 * Flow: `notifySavedSearchMatches(opportunityId)` loads the opportunity once,
 * evaluates every alert-enabled saved search with the shared matcher
 * (`doesOpportunityMatchFilters` + institution overlap), and dispatches through
 * the central `dispatchAlert` (per-channel dedupeKey + dispatch logging).
 *
 * Dedupe key `${userId}:SAVED_SEARCH:${searchId}:${opportunityId}` has no date
 * bucket by design: one (search, opportunity) pair notifies exactly once, ever.
 */

import prisma from '../../database/prisma';
import { OpportunityStatus } from '@fresherflow/database';
import { AlertKind } from '@fresherflow/database';
import type { SavedSearchFilters } from '@fresherflow/types';
import { logger } from '@fresherflow/utils';
import {
    doesOpportunityMatchFilters,
    hasInstitutionOverlap,
    selectAlertKindForMatch,
} from '../../../application/saved-search/matcher';
import { dispatchAlert, newCorrelationId } from './alertDispatch.service';

const MAX_SEARCHES_PER_RUN = 500;

export interface SavedSearchMatchResult {
    checked: number;
    matched: number;
    delivered: number;
    duplicates: number;
    skippedDisabled: number;
}

export async function notifySavedSearchMatches(opportunityId: string): Promise<SavedSearchMatchResult> {
    const correlationId = newCorrelationId();
    const empty: SavedSearchMatchResult = {
        checked: 0,
        matched: 0,
        delivered: 0,
        duplicates: 0,
        skippedDisabled: 0,
    };

    const opportunity = await prisma.opportunity.findFirst({
        where: { id: opportunityId, deletedAt: null, status: OpportunityStatus.PUBLISHED },
        select: {
            id: true,
            company: true,
            locations: true,
            tags: true,
            requiredSkills: true,
            allowedPassoutYears: true,
            salaryMin: true,
            salaryMax: true,
            expiresAt: true,
            category: true,
            employmentTypes: true,
            recruitmentMethod: true,
            workMode: true,
            institutions: { select: { institutionId: true } },
        },
    });

    if (!opportunity) {
        logger.info('[saved-search] Skipping alerts for missing/unpublished opportunity', { opportunityId });
        return empty;
    }

    const opportunityInstitutionIds = opportunity.institutions.map((r) => r.institutionId);

    const searches = await prisma.savedSearch.findMany({
        where: { alertEnabled: true },
        take: MAX_SEARCHES_PER_RUN,
        orderBy: { createdAt: 'asc' },
        select: {
            id: true,
            userId: true,
            filters: true,
            institutions: { select: { institutionId: true } },
            user: { select: { alertPreference: { select: { enabled: true } } } },
        },
    });

    const result: SavedSearchMatchResult = { ...empty, checked: searches.length };
    const touchedSearchIds: string[] = [];

    for (const search of searches) {
        const preference = search.user?.alertPreference;
        if (preference && preference.enabled === false) {
            result.skippedDisabled += 1;
            continue;
        }

        const filters = search.filters as unknown as SavedSearchFilters;
        const matches = doesOpportunityMatchFilters(
            {
                id: opportunity.id,
                company: opportunity.company,
                locations: opportunity.locations,
                tags: opportunity.tags,
                requiredSkills: opportunity.requiredSkills,
                allowedPassoutYears: opportunity.allowedPassoutYears,
                salaryMin: opportunity.salaryMin,
                salaryMax: opportunity.salaryMax,
                expiresAt: opportunity.expiresAt,
                category: opportunity.category as unknown as string,
                employmentTypes: opportunity.employmentTypes as unknown as string[],
                recruitmentMethod: opportunity.recruitmentMethod as unknown as string,
                workMode: opportunity.workMode as unknown as string,
            },
            filters
        );
        if (!matches) continue;

        const searchInstitutionIds = search.institutions.map((r) => r.institutionId);
        if (!hasInstitutionOverlap(searchInstitutionIds, opportunityInstitutionIds)) continue;

        result.matched += 1;
        touchedSearchIds.push(search.id);

        const kindName = selectAlertKindForMatch({
            recruitmentMethod: opportunity.recruitmentMethod as unknown as string,
            institutionIds: opportunityInstitutionIds,
        });
        const kind = kindName === 'CAMPUS_DRIVE' ? AlertKind.CAMPUS_DRIVE : AlertKind.NEW_JOB;

        try {
            const dispatch = await dispatchAlert({
                userId: search.userId,
                opportunityId: opportunity.id,
                kind,
                dedupeKeyBase: `${search.userId}:SAVED_SEARCH:${search.id}:${opportunity.id}`,
                channels: ['APP'],
                metadata: { savedSearchId: search.id, correlationId },
                correlationId,
            });
            if (dispatch.delivered.length > 0) result.delivered += 1;
            else result.duplicates += 1;
        } catch (error) {
            logger.warn('[saved-search] Dispatch failed for search', {
                searchId: search.id,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    if (touchedSearchIds.length > 0) {
        const now = new Date();
        try {
            await prisma.savedSearch.updateMany({
                where: { id: { in: touchedSearchIds } },
                data: { lastMatchedAt: now, lastNotifiedAt: now },
            });
        } catch (error) {
            logger.warn('[saved-search] Failed to stamp matched searches', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    logger.info('[saved-search] Match run completed', { opportunityId, ...result });
    return result;
}
