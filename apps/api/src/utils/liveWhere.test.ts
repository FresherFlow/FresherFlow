/**
 * The canonical liveness rule for every public read of an Opportunity.
 *
 * Two things are pinned here:
 *   1. the rule itself — what a live row has to satisfy;
 *   2. that the rule is IDENTICAL to the CDN snapshot builder's
 *      `FeedGeneratorService.baseLiveWhere` / `liveDriveWhere`, so the public
 *      API and the published feed can never disagree about which rows exist.
 *
 * The second assertion is the drift guard: the feed generator and this helper
 * are two implementations of one business rule, and this test is what makes
 * them one.
 */
import { describe, expect, it, vi } from 'vitest';

// The feed generator pulls in the storage service and the Prisma client at
// import time. Neither is exercised by a pure predicate, so both are stubbed.
vi.mock('../infrastructure/services/platform/storage.service', () => ({
    StorageService: {},
}));

vi.mock('../infrastructure/database/prisma', () => ({ default: {} }));

import { liveOpportunityWhere, liveDriveOpportunityWhere } from './liveWhere';

const NOW = new Date('2026-01-15T00:00:00.000Z');

type DeadlineAxis = { OR: Array<Record<string, unknown>> };

describe('liveOpportunityWhere', () => {
    it('only accepts PUBLISHED rows that are neither soft-deleted nor sweeper-expired', () => {
        const where = liveOpportunityWhere(NOW);

        expect(where.status).toBe('PUBLISHED');
        expect(where.deletedAt).toBeNull();
        expect(where.expiredAt).toBeNull();
    });

    it('treats a null deadline as "no deadline" and a past deadline as expired', () => {
        const where = liveOpportunityWhere(NOW);

        // The main expiry axis.
        expect(where.OR).toEqual([
            { expiresAt: null },
            { expiresAt: { gt: NOW } },
        ]);

        // The three secondary axes the old date cron owned.
        const axes = where.AND as DeadlineAxis[];
        expect(axes).toHaveLength(3);
        expect(axes.map((axis) => Object.keys(axis.OR[0])[0])).toEqual([
            'registrationDeadline',
            'applicationDeadline',
            'endsAt',
        ]);
        for (const axis of axes) {
            const field = Object.keys(axis.OR[0])[0];
            expect(axis.OR[0]).toEqual({ [field]: null });
            expect(axis.OR[1]).toEqual({ [field]: { gt: NOW } });
        }
    });

    it('uses the same instant for every axis so one row cannot straddle the boundary', () => {
        const where = liveOpportunityWhere(NOW);
        const axes = where.AND as DeadlineAxis[];

        for (const axis of axes) {
            const bound = (axis.OR[1] as Record<string, { gt: Date }>)[Object.keys(axis.OR[1])[0]].gt;
            expect(bound.getTime()).toBe(NOW.getTime());
        }
    });
});

describe('liveDriveOpportunityWhere', () => {
    it('passes a listing without DriveDetails and a drive with a future date', () => {
        expect(liveDriveOpportunityWhere(NOW)).toEqual({
            OR: [
                { nextDriveAt: { gte: NOW } },
                { AND: [{ nextDriveAt: null }, { driveDetails: null }] },
            ],
        });
    });
});

describe('the CDN snapshot builder and the public API agree on liveness', () => {
    it('baseLiveWhere is the same rule as liveOpportunityWhere', async () => {
        const { FeedGeneratorService } = await import('../infrastructure/services/opportunity/feedGenerator.service');

        expect(liveOpportunityWhere(NOW)).toEqual(FeedGeneratorService.baseLiveWhere(NOW));
    });

    it('liveDriveWhere is the same rule as liveDriveOpportunityWhere', async () => {
        const { FeedGeneratorService } = await import('../infrastructure/services/opportunity/feedGenerator.service');

        expect(liveDriveOpportunityWhere(NOW)).toEqual(FeedGeneratorService.liveDriveWhere(NOW));
    });
});
