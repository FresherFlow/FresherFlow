import crypto from 'crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = {
    oAuthClient: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
    },
    oAuthAuthorizationCode: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
    },
    oAuthAccessToken: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
    },
    oAuthRefreshToken: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
    },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(prismaMock as any).$transaction = vi.fn(async (cb: (tx: unknown) => unknown) => cb(prismaMock));

vi.mock('../../src/infrastructure/database/prisma', () => ({
    default: prismaMock,
}));

const {
    MCP_OAUTH_SCOPE,
    OAuthError,
    assertRedirectUriAllowed,
    exchangeAuthorizationCode,
    listConnections,
    refreshAccessToken,
    registerClient,
    revokeConnection,
    verifyAccessToken,
    verifyPkceChallenge,
} = await import('../infrastructure/services/platform/mcpOAuth.service');

function sha256(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
}

function challengeFor(verifier: string): string {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
}

const VERIFIER = 'a'.repeat(64);
const CHALLENGE = challengeFor(VERIFIER);

function pendingCode(overrides: Record<string, unknown> = {}) {
    return {
        id: 'code-row-1',
        clientId: 'ffc_abc',
        userId: 'user-1',
        redirectUri: 'https://chatgpt.com/callback',
        codeChallenge: CHALLENGE,
        scope: MCP_OAUTH_SCOPE,
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: null,
        ...overrides,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('verifyPkceChallenge', () => {
    it('accepts the verifier that produced the challenge', () => {
        expect(verifyPkceChallenge(VERIFIER, CHALLENGE)).toBe(true);
    });

    it('rejects a different verifier, and never accepts plain', () => {
        expect(verifyPkceChallenge('b'.repeat(64), CHALLENGE)).toBe(false);
        // "plain" would mean challenge === verifier; S256 only, so this must fail.
        expect(verifyPkceChallenge(VERIFIER, VERIFIER)).toBe(false);
        expect(verifyPkceChallenge('', '')).toBe(false);
    });
});

describe('registerClient', () => {
    it('mints a public client id and de-duplicates its redirect URIs', async () => {
        prismaMock.oAuthClient.create.mockImplementation(({ data }: { data: { clientId: string } }) => ({
            clientId: data.clientId,
            clientName: 'ChatGPT',
            redirectUris: ['https://chatgpt.com/callback'],
        }));

        const client = await registerClient({
            clientName: 'ChatGPT',
            redirectUris: ['https://chatgpt.com/callback', 'https://chatgpt.com/callback'],
        });

        expect(client.clientId).toMatch(/^ffc_/);
        const created = prismaMock.oAuthClient.create.mock.calls[0][0] as {
            data: { redirectUris: string[] };
        };
        expect(created.data.redirectUris).toEqual(['https://chatgpt.com/callback']);
    });

    it('refuses a client with no redirect URIs', async () => {
        await expect(registerClient({ redirectUris: [] })).rejects.toMatchObject({
            status: 400,
            error: 'invalid_redirect_uri',
        });
        expect(prismaMock.oAuthClient.create).not.toHaveBeenCalled();
    });
});

describe('assertRedirectUriAllowed', () => {
    it('matches exactly, so a near-miss URI is refused', () => {
        const client = { redirectUris: ['https://chatgpt.com/callback'] };
        expect(() => assertRedirectUriAllowed(client, 'https://chatgpt.com/callback')).not.toThrow();
        expect(() => assertRedirectUriAllowed(client, 'https://chatgpt.com/callback/extra')).toThrow(OAuthError);
        expect(() => assertRedirectUriAllowed(client, 'https://evil.test/callback')).toThrow(OAuthError);
    });
});

describe('exchangeAuthorizationCode', () => {
    const request = {
        code: 'raw-code',
        clientId: 'ffc_abc',
        redirectUri: 'https://chatgpt.com/callback',
        codeVerifier: VERIFIER,
    };

    it('issues an access and refresh token and burns the code', async () => {
        prismaMock.oAuthAuthorizationCode.findUnique.mockResolvedValue(pendingCode());

        const tokens = await exchangeAuthorizationCode(request);

        expect(tokens.token_type).toBe('Bearer');
        expect(tokens.access_token).toBeTruthy();
        expect(tokens.refresh_token).toBeTruthy();
        expect(tokens.scope).toBe(MCP_OAUTH_SCOPE);
        // Stored hashed, never raw.
        const accessCreate = prismaMock.oAuthAccessToken.create.mock.calls[0][0] as {
            data: { tokenHash: string };
        };
        expect(accessCreate.data.tokenHash).toBe(sha256(tokens.access_token));
        expect(prismaMock.oAuthAuthorizationCode.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { usedAt: expect.any(Date) } }),
        );
    });

    it('refuses a reused code and revokes the tokens it already produced', async () => {
        prismaMock.oAuthAuthorizationCode.findUnique.mockResolvedValue(pendingCode({ usedAt: new Date() }));

        await expect(exchangeAuthorizationCode(request)).rejects.toMatchObject({ error: 'invalid_grant' });

        expect(prismaMock.oAuthAccessToken.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: expect.objectContaining({ userId: 'user-1', clientId: 'ffc_abc' }) }),
        );
        expect(prismaMock.oAuthRefreshToken.updateMany).toHaveBeenCalled();
        expect(prismaMock.oAuthAccessToken.create).not.toHaveBeenCalled();
    });

    it('refuses an expired code, an unknown code, and a mismatched redirect_uri', async () => {
        prismaMock.oAuthAuthorizationCode.findUnique.mockResolvedValue(
            pendingCode({ expiresAt: new Date(Date.now() - 1000) }),
        );
        await expect(exchangeAuthorizationCode(request)).rejects.toMatchObject({ error: 'invalid_grant' });

        prismaMock.oAuthAuthorizationCode.findUnique.mockResolvedValue(null);
        await expect(exchangeAuthorizationCode(request)).rejects.toMatchObject({ error: 'invalid_grant' });

        prismaMock.oAuthAuthorizationCode.findUnique.mockResolvedValue(pendingCode());
        await expect(
            exchangeAuthorizationCode({ ...request, redirectUri: 'https://evil.test/callback' }),
        ).rejects.toMatchObject({ error: 'invalid_grant' });
        expect(prismaMock.oAuthAccessToken.create).not.toHaveBeenCalled();
    });

    it('burns the code when PKCE fails, so it cannot be replayed', async () => {
        prismaMock.oAuthAuthorizationCode.findUnique.mockResolvedValue(pendingCode());

        await expect(
            exchangeAuthorizationCode({ ...request, codeVerifier: 'b'.repeat(64) }),
        ).rejects.toMatchObject({ error: 'invalid_grant' });

        expect(prismaMock.oAuthAuthorizationCode.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { usedAt: expect.any(Date) } }),
        );
        expect(prismaMock.oAuthAccessToken.create).not.toHaveBeenCalled();
    });
});

describe('refreshAccessToken', () => {
    it('rotates the refresh token and returns a new pair', async () => {
        prismaMock.oAuthRefreshToken.findUnique.mockResolvedValue({
            id: 'rt-1',
            clientId: 'ffc_abc',
            userId: 'user-1',
            scope: MCP_OAUTH_SCOPE,
            expiresAt: new Date(Date.now() + 1000_000),
            revokedAt: null,
        });

        const tokens = await refreshAccessToken('old-refresh', 'ffc_abc');

        expect(tokens.access_token).toBeTruthy();
        expect(prismaMock.oAuthRefreshToken.update).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'rt-1' }, data: { revokedAt: expect.any(Date) } }),
        );
    });

    it('refuses a revoked, expired, or foreign-client refresh token', async () => {
        const base = {
            id: 'rt-1', clientId: 'ffc_abc', userId: 'user-1', scope: MCP_OAUTH_SCOPE,
            expiresAt: new Date(Date.now() + 1000_000), revokedAt: null,
        };

        prismaMock.oAuthRefreshToken.findUnique.mockResolvedValue({ ...base, revokedAt: new Date() });
        await expect(refreshAccessToken('x', 'ffc_abc')).rejects.toMatchObject({ error: 'invalid_grant' });

        prismaMock.oAuthRefreshToken.findUnique.mockResolvedValue({ ...base, expiresAt: new Date(Date.now() - 1) });
        await expect(refreshAccessToken('x', 'ffc_abc')).rejects.toMatchObject({ error: 'invalid_grant' });

        prismaMock.oAuthRefreshToken.findUnique.mockResolvedValue(base);
        await expect(refreshAccessToken('x', 'ffc_other')).rejects.toMatchObject({ error: 'invalid_grant' });

        expect(prismaMock.oAuthAccessToken.create).not.toHaveBeenCalled();
    });
});

describe('verifyAccessToken', () => {
    const liveToken = {
        id: 'at-1', userId: 'user-1', clientId: 'ffc_abc', scope: MCP_OAUTH_SCOPE,
        expiresAt: new Date(Date.now() + 60_000), revokedAt: null, lastUsedAt: new Date(),
    };

    it('returns the identity behind a live token', async () => {
        prismaMock.oAuthAccessToken.findUnique.mockResolvedValue(liveToken);

        await expect(verifyAccessToken('live')).resolves.toEqual({
            userId: 'user-1',
            clientId: 'ffc_abc',
            scope: MCP_OAUTH_SCOPE,
        });
    });

    it('returns null for a revoked, expired, or unknown token', async () => {
        prismaMock.oAuthAccessToken.findUnique.mockResolvedValue({ ...liveToken, revokedAt: new Date() });
        await expect(verifyAccessToken('revoked')).resolves.toBeNull();

        prismaMock.oAuthAccessToken.findUnique.mockResolvedValue({ ...liveToken, expiresAt: new Date(Date.now() - 1) });
        await expect(verifyAccessToken('expired')).resolves.toBeNull();

        prismaMock.oAuthAccessToken.findUnique.mockResolvedValue(null);
        await expect(verifyAccessToken('unknown')).resolves.toBeNull();

        await expect(verifyAccessToken('')).resolves.toBeNull();
    });
});

describe('connections', () => {
    it('lists one entry per client, with the most recent use', async () => {
        prismaMock.oAuthAccessToken.findMany.mockResolvedValue([
            {
                id: 'at-1', clientId: 'ffc_abc', createdAt: new Date('2026-10-01T00:00:00Z'),
                lastUsedAt: new Date('2026-10-10T00:00:00Z'), client: { clientName: 'ChatGPT' },
            },
            {
                id: 'at-2', clientId: 'ffc_abc', createdAt: new Date('2026-10-02T00:00:00Z'),
                lastUsedAt: new Date('2026-10-12T00:00:00Z'), client: { clientName: 'ChatGPT' },
            },
            {
                id: 'at-3', clientId: 'ffc_xyz', createdAt: new Date('2026-10-03T00:00:00Z'),
                lastUsedAt: null, client: { clientName: 'Codex' },
            },
        ]);

        const connections = await listConnections('user-1');

        expect(connections).toHaveLength(2);
        expect(connections[0]).toMatchObject({ clientId: 'ffc_abc', clientName: 'ChatGPT' });
        expect(connections[0].lastUsedAt?.toISOString()).toBe('2026-10-12T00:00:00.000Z');
        expect(connections[1]).toMatchObject({ clientId: 'ffc_xyz' });
    });

    it('revokes every token of the connection, for the calling user only', async () => {
        prismaMock.oAuthAccessToken.findFirst.mockResolvedValue({ clientId: 'ffc_abc' });

        await revokeConnection('user-1', 'at-1');

        // Ownership is part of the lookup, not a separate check.
        expect(prismaMock.oAuthAccessToken.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'at-1', userId: 'user-1' } }),
        );
        expect(prismaMock.oAuthAccessToken.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({ data: { revokedAt: expect.any(Date) } }),
        );
        expect(prismaMock.oAuthRefreshToken.updateMany).toHaveBeenCalled();
    });

    it('refuses a connection the caller does not own', async () => {
        prismaMock.oAuthAccessToken.findFirst.mockResolvedValue(null);

        await expect(revokeConnection('user-2', 'at-1')).rejects.toMatchObject({ status: 404 });
        expect(prismaMock.oAuthAccessToken.updateMany).not.toHaveBeenCalled();
    });
});
