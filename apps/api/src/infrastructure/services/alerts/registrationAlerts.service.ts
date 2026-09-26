/**
 * Phase 7 — registration / campus-drive alert producers.
 *
 * Kinds produced here (all exist in the frozen schema):
 * - REGISTRATION_OPEN: applicationStartDate fell inside the last 24h.
 * - REGISTRATION_CLOSING: registrationDeadline or applicationDeadline is
 *   within the next 72h (canonical date rule: Opportunity-level columns drive
 *   behaviour; GovernmentJobDetails raw strings are display-only).
 * - CAMPUS_DRIVE: ON_CAMPUS / POOL_CAMPUS recruitment with linked institutions.
 * - CLOSING_SOON (deadline flavour): applicationDeadline within 48h for users
 *   with closingSoon enabled. The expiry-based closing-soon in alerts.service
 *   stays the owner for expiresAt; this covers the application-deadline axis.
 *
 * Bounded by design: capped opportunities × capped users, per-channel dedupe
 * with a daily bucket, dispatch logging on every path.
 */

import prisma from '../../database/prisma';
import { AlertKind, OpportunityStatus } from '@fresherflow/database';
import { logger } from '@fresherflow/utils';
import { dispatchAlert, getDispatchDateBucket, newCorrelationId } from './alertDispatch.service';

const MAX_OPPORTUNITIES_PER_KIND = 30;
const MAX_USERS_PER_RUN = 200;

async function loadAlertableUserIds(): Promise<string[]> {
    const users = await prisma.user.findMany({
        where: {
            role: { in: ['USER', 'ADMIN'] },
            OR: [{ alertPreference: null }, { alertPreference: { is: { enabled: true } } }],
        },
        select: { id: true },
        take: MAX_USERS_PER_RUN,
    });
    return users.map((u) => u.id);
}

export interface RegistrationAlertCounts {
    registrationOpen: number;
    registrationClosing: number;
    campusDrive: number;
    closingSoonDeadline: number;
}

export async function runRegistrationAlertsCycle(now = new Date()): Promise<RegistrationAlertCounts> {
    const correlationId = newCorrelationId();
    const dateBucket = getDispatchDateBucket(now);
    const counts: RegistrationAlertCounts = {
        registrationOpen: 0,
        registrationClosing: 0,
        campusDrive: 0,
        closingSoonDeadline: 0,
    };

    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const in72h = new Date(now.getTime() + 72 * 60 * 60 * 1000);
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const baseWhere = {
        status: OpportunityStatus.PUBLISHED,
        deletedAt: null,
        expiredAt: null,
    } as const;

    const [registrationOpened, registrationClosing, campusDrives, deadlineClosing] = await Promise.all([
        prisma.opportunity.findMany({
            where: { ...baseWhere, applicationStartDate: { gte: dayAgo, lte: now } },
            select: { id: true, title: true, company: true },
            orderBy: { applicationStartDate: 'desc' },
            take: MAX_OPPORTUNITIES_PER_KIND,
        }),
        prisma.opportunity.findMany({
            where: {
                ...baseWhere,
                OR: [
                    { registrationDeadline: { gt: now, lte: in72h } },
                    { applicationDeadline: { gt: now, lte: in72h } },
                ],
            },
            select: { id: true, title: true, company: true },
            orderBy: { registrationDeadline: 'asc' },
            take: MAX_OPPORTUNITIES_PER_KIND,
        }),
        prisma.opportunity.findMany({
            where: {
                ...baseWhere,
                recruitmentMethod: { in: ['ON_CAMPUS', 'POOL_CAMPUS'] as never },
                institutions: { some: {} },
            },
            select: { id: true, title: true, company: true },
            orderBy: { postedAt: 'desc' },
            take: MAX_OPPORTUNITIES_PER_KIND,
        }),
        prisma.opportunity.findMany({
            where: { ...baseWhere, applicationDeadline: { gt: now, lte: in48h } },
            select: { id: true, title: true, company: true },
            orderBy: { applicationDeadline: 'asc' },
            take: MAX_OPPORTUNITIES_PER_KIND,
        }),
    ]);

    if (
        registrationOpened.length === 0 &&
        registrationClosing.length === 0 &&
        campusDrives.length === 0 &&
        deadlineClosing.length === 0
    ) {
        return counts;
    }

    const userIds = await loadAlertableUserIds();

    async function fanOut(
        opportunities: Array<{ id: string }>,
        kind: AlertKind,
        counter: keyof RegistrationAlertCounts
    ): Promise<void> {
        for (const opp of opportunities) {
            for (const userId of userIds) {
                try {
                    const dispatch = await dispatchAlert({
                        userId,
                        opportunityId: opp.id,
                        kind,
                        dedupeKeyBase: `${userId}:${kind}:${opp.id}:${dateBucket}`,
                        channels: ['APP'],
                        metadata: { source: 'registration-cycle' },
                        correlationId,
                    });
                    if (dispatch.delivered.length > 0) counts[counter] += 1;
                } catch (error) {
                    logger.warn('[registration-alerts] Dispatch failed', {
                        kind,
                        opportunityId: opp.id,
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            }
        }
    }

    await fanOut(registrationOpened, AlertKind.REGISTRATION_OPEN, 'registrationOpen');
    await fanOut(registrationClosing, AlertKind.REGISTRATION_CLOSING, 'registrationClosing');
    await fanOut(campusDrives, AlertKind.CAMPUS_DRIVE, 'campusDrive');
    await fanOut(deadlineClosing, AlertKind.CLOSING_SOON, 'closingSoonDeadline');

    logger.info('[registration-alerts] Cycle completed', { ...counts });
    return counts;
}
