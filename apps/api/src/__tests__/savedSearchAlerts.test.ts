/**
 * Phase 7 gate: create a saved search → a matching opportunity appears →
 * exactly the intended notification is delivered → duplicates are prevented.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AlertKind } from '@fresherflow/database';

process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.REDIS_ENABLED = 'false';

const prismaMock = {
    opportunity: {
        findFirst: vi.fn(),
    },
    savedSearch: {
        findMany: vi.fn(),
        updateMany: vi.fn(),
    },
    alertDelivery: {
        findUnique: vi.fn(),
        create: vi.fn(),
    },
    alertDispatchLog: {
        create: vi.fn(),
        findMany: vi.fn(),
    },
};

vi.mock('@fresherflow/database', async () => {
    const enums = await import('./helpers/dbEnums');
    return {
        ...enums,
        prisma: prismaMock,
        redis: {},
        AlertKind: {
            ...(enums as Record<string, unknown>).AlertKind,
            DAILY_DIGEST: 'DAILY_DIGEST',
            CLOSING_SOON: 'CLOSING_SOON',
            HIGHLIGHT: 'HIGHLIGHT',
            APP_UPDATE: 'APP_UPDATE',
            NEW_JOB: 'NEW_JOB',
            EVENT_REMINDER: 'EVENT_REMINDER',
            CAMPUS_DRIVE: 'CAMPUS_DRIVE',
            REGISTRATION_OPEN: 'REGISTRATION_OPEN',
            REGISTRATION_CLOSING: 'REGISTRATION_CLOSING',
            APPLICATION_UPDATE: 'APPLICATION_UPDATE',
        },
        AlertChannel: {
            ...(enums as Record<string, unknown>).AlertChannel,
            EMAIL: 'EMAIL',
            APP: 'APP',
            PUSH: 'PUSH',
        },
        OpportunityStatus: { DRAFT: 'DRAFT', PUBLISHED: 'PUBLISHED', ARCHIVED: 'ARCHIVED' },
        EmploymentType: {
            FULL_TIME: 'FULL_TIME',
            INTERNSHIP: 'INTERNSHIP',
        },
        RecruitmentMethod: {
            REGULAR: 'REGULAR',
            ON_CAMPUS: 'ON_CAMPUS',
            POOL_CAMPUS: 'POOL_CAMPUS',
            WALK_IN: 'WALK_IN',
        },
    };
});

const matchingOpportunity = {
    id: 'opp-1',
    company: 'Acme',
    locations: ['Bangalore'],
    tags: ['backend'],
    requiredSkills: ['node'],
    allowedPassoutYears: [2026],
    salaryMin: 400,
    salaryMax: 600,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    category: 'EMPLOYMENT',
    employmentTypes: ['FULL_TIME'],
    recruitmentMethod: 'REGULAR',
    workMode: 'ONSITE',
    institutions: [],
};

const matchingSearch = {
    id: 'ss-1',
    userId: 'user-1',
    filters: { company: 'Acme', city: 'Bangalore', batch: 2026 },
    institutions: [],
    user: { alertPreference: { enabled: true } },
};

beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.opportunity.findFirst.mockResolvedValue(matchingOpportunity);
    prismaMock.savedSearch.findMany.mockResolvedValue([matchingSearch]);
    prismaMock.savedSearch.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.alertDelivery.findUnique.mockResolvedValue(null);
    prismaMock.alertDelivery.create.mockResolvedValue({ id: 'ad-1' });
    prismaMock.alertDispatchLog.create.mockResolvedValue({ id: 'log-1' });
    prismaMock.alertDispatchLog.findMany.mockResolvedValue([]);
});

describe('Phase 7 gate: saved search → matching opportunity → exactly one notification', () => {
    it('delivers exactly one NEW_JOB APP notification for a matching opportunity', async () => {
        const { notifySavedSearchMatches } = await import('../infrastructure/services/savedSearchAlert.service');

        const result = await notifySavedSearchMatches('opp-1');

        expect(result.checked).toBe(1);
        expect(result.matched).toBe(1);
        expect(result.delivered).toBe(1);
        expect(prismaMock.alertDelivery.create).toHaveBeenCalledTimes(1);
        const payload = prismaMock.alertDelivery.create.mock.calls[0][0];
        expect(payload.data.userId).toBe('user-1');
        expect(payload.data.opportunityId).toBe('opp-1');
        expect(payload.data.kind).toBe('NEW_JOB');
        expect(payload.data.channel).toBe('APP');
        expect(String(payload.data.dedupeKey)).toContain('SAVED_SEARCH:ss-1:opp-1');
    });

    it('prevents duplicate delivery on a second run for the same match', async () => {
        const { notifySavedSearchMatches } = await import('../infrastructure/services/savedSearchAlert.service');

        await notifySavedSearchMatches('opp-1');
        expect(prismaMock.alertDelivery.create).toHaveBeenCalledTimes(1);

        // The dedupe row now exists: the second run must not create another.
        prismaMock.alertDelivery.findUnique.mockResolvedValue({ id: 'ad-1' });
        prismaMock.alertDelivery.create.mockClear();

        const second = await notifySavedSearchMatches('opp-1');
        expect(second.matched).toBe(1);
        expect(second.delivered).toBe(0);
        expect(second.duplicates).toBe(1);
        expect(prismaMock.alertDelivery.create).not.toHaveBeenCalled();
    });

    it('produces no notification when the opportunity does not match', async () => {
        prismaMock.savedSearch.findMany.mockResolvedValue([
            { ...matchingSearch, id: 'ss-2', filters: { company: 'OtherCorp' } },
        ]);
        const { notifySavedSearchMatches } = await import('../infrastructure/services/savedSearchAlert.service');

        const result = await notifySavedSearchMatches('opp-1');
        expect(result.matched).toBe(0);
        expect(result.delivered).toBe(0);
        expect(prismaMock.alertDelivery.create).not.toHaveBeenCalled();
    });

    it('dispatches once per channel with dispatch logging (dedupe + retry surface)', async () => {
        const { dispatchAlert, retryFailedDispatches } = await import(
            '../infrastructure/services/alertDispatch.service'
        );

        const first = await dispatchAlert({
            userId: 'user-1',
            opportunityId: 'opp-1',
            kind: 'NEW_JOB' as never,
            dedupeKeyBase: 'user-1:TEST:opp-1',
            channels: ['APP'],
        });
        expect(first.delivered).toEqual(['APP']);
        expect(prismaMock.alertDispatchLog.create).toHaveBeenCalled();

        prismaMock.alertDelivery.findUnique.mockResolvedValue({ id: 'ad-1' });
        const second = await dispatchAlert({
            userId: 'user-1',
            opportunityId: 'opp-1',
            kind: 'NEW_JOB' as never,
            dedupeKeyBase: 'user-1:TEST:opp-1',
            channels: ['APP'],
        });
        expect(second.delivered).toEqual([]);
        expect(second.skipped[0]?.reason).toBe('DEDUPE_HIT');

        const retry = await retryFailedDispatches(10);
        expect(retry.retried).toBeGreaterThanOrEqual(0);
    });
});
