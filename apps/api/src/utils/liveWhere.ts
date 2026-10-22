import { Prisma, OpportunityStatus } from '@fresherflow/database';

/**
 * THE canonical "is this opportunity live?" rule for every PUBLIC read of an
 * Opportunity.
 *
 * ── Why it lives here and not in `packages/utils` ────────────────────────────
 * A Prisma `where` clause needs the Prisma types, and those live in
 * `@fresherflow/database`, which is a `server-only` package. `packages/utils`
 * is imported by the web and mobile apps, so a Prisma-typed helper there would
 * make a client-ui-safe package depend on server-only types. The rule
 * therefore lives inside the API, next to its only consumers:
 *   - `routes/public/opportunities/feed.ts`    (the guest feed)
 *   - `routes/public/opportunities/detail.ts`  (the guest detail page)
 * The CDN snapshot builder (`FeedGeneratorService.baseLiveWhere`) is the same
 * rule; `utils/liveWhere.test.ts` pins the two together so they cannot drift.
 *
 * ── What "live" means ───────────────────────────────────────────────────────
 * A row is live only when ALL of the following hold:
 *   1. `status = PUBLISHED`   — DRAFT / ARCHIVED are never public
 *   2. `deletedAt IS NULL`    — soft-deleted rows are never public
 *   3. `expiredAt IS NULL`    — the expiry sweeper's stamp
 *   4. every deadline axis is unset OR still in the future:
 *      `expiresAt`, `registrationDeadline`, `applicationDeadline`, `endsAt`
 *
 * `null` on a deadline means "no deadline", never "expired".
 *
 * ── How to use it ───────────────────────────────────────────────────────────
 * The returned object carries its own top-level `OR` and `AND`, so it must be
 * combined with other conditions through `AND`, never spread into a `where`
 * that already has its own top-level `OR`:
 *
 *     where: { AND: [ liveOpportunityWhere(now), { category: 'EMPLOYMENT' } ] }
 */
export function liveOpportunityWhere(now: Date = new Date()): Prisma.OpportunityWhereInput {
    return {
        status: OpportunityStatus.PUBLISHED,
        deletedAt: null,
        expiredAt: null,
        OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } },
        ],
        AND: [
            { OR: [{ registrationDeadline: null }, { registrationDeadline: { gt: now } }] },
            { OR: [{ applicationDeadline: null }, { applicationDeadline: { gt: now } }] },
            { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
        ],
    };
}

/**
 * The drive-date rule, applied on top of {@link liveOpportunityWhere} by the
 * feeds that LIST walk-in drives.
 *
 * `nextDriveAt` is null both for listings with no DriveDetails and for drives
 * whose last date has passed, so `null` on its own cannot mean "no drive".
 * Only a row without DriveDetails passes on null — that is exactly the
 * past-date drive this rule exists to hide.
 *
 * Mirrors `FeedGeneratorService.liveDriveWhere`, which the CDN snapshot
 * builder uses for the feed index and the walk-in feed.
 */
export function liveDriveOpportunityWhere(now: Date = new Date()): Prisma.OpportunityWhereInput {
    return {
        OR: [
            { nextDriveAt: { gte: now } },
            { AND: [{ nextDriveAt: null }, { driveDetails: null }] },
        ],
    };
}
