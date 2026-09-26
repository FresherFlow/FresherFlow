import { Router, Request, Response, NextFunction } from 'express';
import {
    searchOpportunities,
    parseOpportunityFilters,
} from '../../../application/opportunity';
import prisma from '../../../infrastructure/database/prisma';
import { filterAndRankOpportunitiesForUser } from '@fresherflow/utils';
import { Opportunity, Profile } from '@fresherflow/types';
import {
    isLikelyBotTraffic, publicFeedLimiter, publicFeedBotLimiter
} from './_helpers';

const router: Router = Router();

function adaptiveSearchLimiter(req: Request, res: Response, next: NextFunction) {
    if (isLikelyBotTraffic(req)) return publicFeedBotLimiter(req, res, next);
    return publicFeedLimiter(req, res, next);
}

router.get('/search', adaptiveSearchLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Phase 6: all 23 filter dimensions are parsed centrally in
        // `application/opportunity/filters.ts`. The parser clamps page/limit
        // and drops malformed values rather than throwing, so a stale share
        // link can no longer 400 the endpoint.
        const filters = parseOpportunityFilters(req.query as Record<string, unknown>);

        const searchResults = await searchOpportunities(filters, {
            includeTotal: true,
        });

        let hits = searchResults.hits;

        if (req.userId && hits.length > 0) {
            const [user, savedRows] = await Promise.all([
                prisma.user.findUnique({
                    where: { id: req.userId },
                    select: { role: true, profile: true }
                }),
                prisma.opportunity.findMany({
                    where: { id: { in: hits.map((hit) => hit.id) } },
                    select: {
                        id: true,
                        savedBy: {
                            where: { userId: req.userId },
                            select: { id: true },
                            take: 1,
                        }
                    }
                })
            ]);

            const savedIds = new Set(
                savedRows
                    .filter((row) => row.savedBy.length > 0)
                    .map((row) => row.id)
            );

            hits = hits.map((hit) => ({
                ...hit,
                isSaved: savedIds.has(hit.id),
            }));

            if (user?.role !== 'ADMIN' && user?.profile) {
                hits = filterAndRankOpportunitiesForUser(
                    hits as Opportunity[],
                    user.profile as unknown as Profile,
                    req.userId
                )
                    .map((item) => item.opportunity) as typeof hits;
            }
        }

        // Personalized re-ranking is a presentation concern, so it happens
        // after the DB filter rather than inside it. `filterAndRank...` can
        // drop hits, so `totalHits` is deliberately left as the unranked DB
        // count rather than a number the client cannot reconcile with the page
        // it just received.
        res.setHeader('Cache-Control', 'private, no-store');
        return res.json({
            hits,
            totalHits: searchResults.totalHits,
            hasMore: searchResults.hasMore,
            page: filters.page,
            limit: filters.limit,
            sort: filters.sort,
            // Echo the normalized filters so a client can rebuild its UI state
            // from the response instead of re-parsing the URL it sent.
            appliedFilters: {
                category: filters.category,
                employmentTypes: filters.employmentTypes,
                recruitmentMethods: filters.recruitmentMethods,
                workModes: filters.workModes,
                sectors: filters.sectors,
                experienceLevels: filters.experienceLevels,
                degrees: filters.degrees,
                courses: filters.courses,
                specializations: filters.specializations,
                passoutYears: filters.passoutYears,
                availabilities: filters.availabilities,
                skills: filters.skills,
                locations: filters.locations,
                applicantLocations: filters.applicantLocations,
                sourceKinds: filters.sourceKinds,
                trustLevels: filters.trustLevels,
                tags: filters.tags,
                salaryMin: filters.salaryMin,
                salaryMax: filters.salaryMax,
                experienceMin: filters.experienceMin,
                experienceMax: filters.experienceMax,
                passoutYearMin: filters.passoutYearMin,
                passoutYearMax: filters.passoutYearMax,
                postedWithinDays: filters.postedWithinDays,
                deadlineBefore: filters.deadlineBefore,
                expiresAfter: filters.expiresAfter,
                siteMode: filters.siteMode,
            },
        });

    } catch (error) {
        next(error);
    }
});

export default router;
