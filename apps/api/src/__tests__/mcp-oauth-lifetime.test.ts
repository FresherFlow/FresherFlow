import crypto from 'crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Long-lived MCP connection coverage, shaped after OpenSEO's
 * oauth-refresh.e2e.test.ts. An AI client that stays connected refreshes its
 * access token before it expires; the grant must survive that for weeks.
 * This is the contract behind "connect once, stay connected".
 */

const CLIENT_ID = 'ffc_chatgpt';
const USER_ID = 'user-1';
const RESOURCE = 'https://mcp.fresherflow.in/mcp';
const REDIRECT_URI = 'http://127.0.0.1:9000/callback';
const DAY_MS = 24 * 60 * 60 * 1000;

type Row = Record<string, unknown> & {
    id: string;
    tokenHash: string;
    expiresAt: Date;
    revokedAt: Date | null;
};

const refreshRows: Row[] = [];
const accessRows: Row[] = [];
let sequence = 0;
let codeUsedAt: Date | null = null;

const prismaMock = {
    oAuthClient: { update: vi.fn() },
    oAuthAuthorizationCode: {
        findUnique: vi.fn(),
        updateMany: vi.fn(),
    },
    oAuthAccessToken: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
    },
    oAuthRefreshToken: {
        create: vi.fn(),
        findUnique: vi.fn(),
        updateMany: vi.fn(),
    },
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(prismaMock as any).$transaction = vi.fn(async (cb: (tx: unknown) => unknown) => cb(prismaMock));

vi.mock('../../src/infrastructure/database/prisma', () => ({ default: prismaMock }));

const { exchangeAuthorizationCode, refreshAccessToken, verifyAccessToken } = await import(
    '../infrastructure/services/platform/mcpOAuth.service'
);

function sha256(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
}

const VERIFIER = 'a'.repeat(64);
const CHALLENGE = crypto.createHash('sha256').update(VERIFIER).digest('base64url');

async function advanceDays(days: number): Promise<void> {
    // A minute past the boundary: expiry is checked with a strict `<`, so
    // exactly 24 hours is still a live token.
    await vi.advanceTimersByTimeAsync(days * DAY_MS + 60_000);
}

beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
});

afterAll(() => {
    vi.useRealTimers();
});

beforeEach(() => {
    refreshRows.length = 0;
    accessRows.length = 0;
    codeUsedAt = null;
    vi.clearAllMocks();

    prismaMock.oAuthAuthorizationCode.findUnique.mockImplementation(() =>
        Promise.resolve({
            id: 'code-1',
            clientId: CLIENT_ID,
            userId: USER_ID,
            redirectUri: REDIRECT_URI,
            codeChallenge: CHALLENGE,
            scope: 'mcp',
            resource: RESOURCE,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
            usedAt: codeUsedAt,
        }),
    );
    prismaMock.oAuthAuthorizationCode.updateMany.mockImplementation(() => {
        codeUsedAt = new Date();
        return Promise.resolve({ count: 1 });
    });

    prismaMock.oAuthAccessToken.create.mockImplementation(({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `at-${++sequence}`, revokedAt: null, lastUsedAt: null, ...data } as Row;
        accessRows.push(row);
        return Promise.resolve(row);
    });
    prismaMock.oAuthAccessToken.findUnique.mockImplementation(({ where }: { where: { tokenHash: string } }) =>
        Promise.resolve(accessRows.find((row) => row.tokenHash === where.tokenHash) ?? null),
    );
    prismaMock.oAuthAccessToken.update.mockImplementation(({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = accessRows.find((entry) => entry.id === where.id);
        if (row) Object.assign(row, data);
        return Promise.resolve(row);
    });

    prismaMock.oAuthRefreshToken.create.mockImplementation(({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `rt-${++sequence}`, revokedAt: null, ...data } as Row;
        refreshRows.push(row);
        return Promise.resolve(row);
    });
    prismaMock.oAuthRefreshToken.findUnique.mockImplementation(({ where }: { where: { tokenHash: string } }) =>
        Promise.resolve(refreshRows.find((row) => row.tokenHash === where.tokenHash) ?? null),
    );
    prismaMock.oAuthRefreshToken.updateMany.mockImplementation(
        ({ where, data }: { where: { id: string; expiresAt: { gt: Date } }; data: Record<string, unknown> }) => {
            const row = refreshRows.find((entry) => entry.id === where.id);
            if (!row || row.revokedAt || row.expiresAt <= where.expiresAt.gt) return Promise.resolve({ count: 0 });
            Object.assign(row, data);
            return Promise.resolve({ count: 1 });
        },
    );
    prismaMock.oAuthClient.update.mockResolvedValue({});
});

describe('long-lived MCP connection', () => {
    it('stays connected through refreshes across weeks, like OpenSEO', async () => {
        let tokens = await exchangeAuthorizationCode({
            code: 'code-1',
            clientId: CLIENT_ID,
            redirectUri: REDIRECT_URI,
            codeVerifier: VERIFIER,
        });
        expect(tokens.expires_in).toBe(86400);
        expect(tokens.refresh_token).toBeTruthy();
        await expect(verifyAccessToken(tokens.access_token, RESOURCE)).resolves.toMatchObject({ userId: USER_ID });

        // A client refreshes before the 24-hour token expires. Omitting
        // client_id is normal for a public client and must not break it.
        for (const days of [1, 29, 31]) {
            await advanceDays(days);
            await expect(verifyAccessToken(tokens.access_token, RESOURCE)).resolves.toBeNull();

            tokens = await refreshAccessToken(tokens.refresh_token, undefined);

            expect(tokens.expires_in).toBe(86400);
            expect(tokens.refresh_token).toBeTruthy();
            await expect(verifyAccessToken(tokens.access_token, RESOURCE)).resolves.toMatchObject({
                userId: USER_ID,
                clientId: CLIENT_ID,
                resource: RESOURCE,
            });
        }
    });

    it('rejects only a mismatched explicit client_id on refresh', async () => {
        const tokens = await exchangeAuthorizationCode({
            code: 'code-1',
            clientId: CLIENT_ID,
            redirectUri: REDIRECT_URI,
            codeVerifier: VERIFIER,
        });

        await expect(refreshAccessToken(tokens.refresh_token, 'ffc_other')).rejects.toMatchObject({
            error: 'invalid_grant',
        });
        // The token was not consumed by the rejected attempt.
        await expect(refreshAccessToken(tokens.refresh_token, CLIENT_ID)).resolves.toMatchObject({
            expires_in: 86400,
        });
    });
});
