/**
 * LIVE database smoke tests — Phase 2 gate.
 *
 * OFFLINE-SAFE BY DEFAULT: the whole suite is wrapped in
 * `describe.skipIf(!LIVE_DB)`, so a plain `pnpm test` / `vitest run` never
 * opens a network connection. Live mode requires an explicit opt-in:
 *
 *   LIVE_DB_TESTS=1 pnpm --filter ./apps/api test -- live-db-smoke
 *
 * SAFETY RULES (never relax these):
 * - No `migrate deploy`, no seeds, no writes to existing rows. Ever.
 * - Every written row carries a unique `smoke-<runId>-` marker in slug+title.
 * - Cleanup is marker-scoped (`slug startsWith <marker>`), so it is
 *   structurally impossible to touch a real listing.
 * - The rollback test throws intentionally inside the transaction, leaving
 *   zero trace by construction.
 *
 * What is covered (mirrors the Phase 2 gate):
 * - connectivity against the real PostgreSQL database
 * - Opportunity CRUD round-trip + soft-delete exclusion, with cleanup
 * - `prisma.$transaction` atomicity via an intentional rollback
 * - standardized pagination (`parsePagination`/`buildPaginationMeta`) + filter
 */

import '../bootstrap';

import { afterAll, describe, expect, it } from 'vitest';
import { OpportunityCategory, OpportunityStatus } from '@fresherflow/database';
import prisma from '../infrastructure/database/prisma';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';

const LIVE_DB =
    process.env.LIVE_DB_TESTS === '1' || process.env.LIVE_DB_TESTS === 'true';

// Unique per run (base36 timestamp). Real slugs never start with `smoke-`.
const runId = Date.now().toString(36);
const marker = `smoke-${runId}-`;

function smokeData(suffix: string) {
    const slug = `${marker}${suffix}`;
    return {
        slug,
        title: `${marker}smoke opportunity ${suffix}`,
        company: `${marker}smoke co`,
        description: 'Phase 2 live smoke test row. Safe to delete.',
        category: OpportunityCategory.EMPLOYMENT,
        status: OpportunityStatus.DRAFT,
    };
}

/** Marker-scoped cleanup: can only ever match rows created by this run. */
async function cleanupSmokeRows(): Promise<void> {
    await prisma.opportunity.deleteMany({
        where: { slug: { startsWith: marker } },
    });
}

describe.skipIf(!LIVE_DB)('live-db-smoke (Phase 2 gate)', () => {
    afterAll(async () => {
        await cleanupSmokeRows().catch(() => undefined);
        await prisma.$disconnect().catch(() => undefined);
    });

    it('connects to the real PostgreSQL database', async () => {
        const rows = await prisma.$queryRaw<Array<{ ok: number }>>`SELECT 1 as ok`;
        expect(rows[0]?.ok).toBe(1);
    });

    it('CRUD round-trip on an Opportunity, then cleans up', async () => {
        const data = smokeData('crud');

        const created = await prisma.opportunity.create({ data });
        expect(created.id).toBeTruthy();

        try {
            const read = await prisma.opportunity.findFirst({
                where: { slug: data.slug, deletedAt: null },
            });
            expect(read?.title).toBe(data.title);

            const updated = await prisma.opportunity.update({
                where: { id: created.id },
                data: { title: `${marker}smoke opportunity crud (updated)` },
            });
            expect(updated.title).toContain('(updated)');

            // Soft-delete must hide the row from standard reads.
            await prisma.opportunity.update({
                where: { id: created.id },
                data: { deletedAt: new Date(), deletionReason: `${marker}smoke cleanup` },
            });
            const hidden = await prisma.opportunity.findFirst({
                where: { slug: data.slug, deletedAt: null },
            });
            expect(hidden).toBeNull();
        } finally {
            await prisma.opportunity.deleteMany({ where: { slug: data.slug } });
        }

        const gone = await prisma.opportunity.findFirst({ where: { slug: data.slug } });
        expect(gone).toBeNull();
    });

    it('$transaction rolls back completely on error (zero trace)', async () => {
        const data = smokeData('rollback');

        await expect(
            prisma.$transaction(async (tx) => {
                await tx.opportunity.create({ data });
                throw new Error('intentional-rollback');
            }),
        ).rejects.toThrow('intentional-rollback');

        const leaked = await prisma.opportunity.findFirst({ where: { slug: data.slug } });
        expect(leaked).toBeNull();
    });

    it('standardized pagination + soft-delete filter over live rows', async () => {
        const rows = ['pg-a', 'pg-b', 'pg-c'].map((suffix) => smokeData(suffix));
        try {
            await prisma.opportunity.createMany({ data: rows });
            // Soft-delete one: only two rows must remain visible.
            await prisma.opportunity.updateMany({
                where: { slug: rows[2].slug },
                data: { deletedAt: new Date(), deletionReason: `${marker}smoke cleanup` },
            });

            const liveWhere = { slug: { startsWith: `${marker}pg-` }, deletedAt: null };

            const first = parsePagination({ page: '1', limit: '2' });
            expect(first).toEqual({ page: 1, limit: 2, skip: 0, take: 2 });

            const page1 = await prisma.opportunity.findMany({
                where: liveWhere,
                orderBy: { slug: 'asc' },
                skip: first.skip,
                take: first.take,
            });
            expect(page1).toHaveLength(2);

            const page2 = await prisma.opportunity.findMany({
                where: liveWhere,
                orderBy: { slug: 'asc' },
                skip: 2,
                take: 2,
            });
            expect(page2).toHaveLength(0);

            const total = await prisma.opportunity.count({ where: liveWhere });
            expect(total).toBe(2);

            const meta = buildPaginationMeta(total, first.page, first.limit);
            expect(meta).toEqual({ total: 2, page: 1, pageSize: 2, totalPages: 1 });
        } finally {
            await prisma.opportunity.deleteMany({
                where: { slug: { startsWith: `${marker}pg-` } },
            });
        }
    });
});
