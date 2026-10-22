import { whoami } from './api/identity.js';
import { logger } from './logger.js';

/**
 * Who this MCP connection is acting as, and what that account may do.
 *
 * ChatGPT and Claude pick tools from the list the server advertises, so the
 * role has to be known *before* the tool list is built. `transport.ts` resolves
 * it once per HTTP request and hands it to `createFresherFlowMcpServer`, which
 * registers only the tools that role may actually use.
 *
 * The role comes from the API, never from the client: the OAuth token is opaque
 * and the caller cannot claim a role. `whoami` resolves it from the same RBAC
 * grants the admin panel edits, so promoting someone to moderator in the admin
 * panel changes what their AI client can do on its next request.
 */

export type McpRole = 'moderator' | 'user';

export interface McpCapabilities {
    browseJobs: boolean;
    submitOpportunity: boolean;
    submitPublishes: boolean;
    viewOwnSubmissions: boolean;
    withdrawOwnSubmission: boolean;
    reviewSubmissions: boolean;
    approveSubmissions: boolean;
    createFullListing: boolean;
    editFullListing: boolean;
}

export interface ConnectionIdentity {
    userId: string;
    /** Best human label for the account: full name, else username, else id. */
    displayName: string;
    username: string | null;
    role: McpRole;
    capabilities: McpCapabilities;
}

/** Capability set for an account the API could not describe beyond "signed in". */
const NO_PRIVILEGES: McpCapabilities = {
    browseJobs: true,
    submitOpportunity: true,
    submitPublishes: false,
    viewOwnSubmissions: true,
    withdrawOwnSubmission: true,
    reviewSubmissions: false,
    approveSubmissions: false,
    createFullListing: false,
    editFullListing: false,
};

/**
 * Short-lived cache of resolved identities.
 *
 * Every MCP request builds a fresh server, which means one `whoami` round-trip
 * per request. A minute of caching removes the cost of a client that lists its
 * tools and then makes a burst of calls, while keeping a role change visible
 * quickly. Keyed by the token itself (never logged), and bounded so a long-lived
 * process cannot accumulate tokens.
 */
const CACHE_TTL_MS = 60 * 1000;
const CACHE_MAX_ENTRIES = 500;
const identityCache = new Map<string, { identity: ConnectionIdentity; expiresAt: number }>();

function cacheKey(token: string): string {
    return token;
}

function pruneCache(now: number): void {
    for (const [key, entry] of identityCache) {
        if (entry.expiresAt <= now) identityCache.delete(key);
    }
    // A single user with many connections must not evict everyone else, but the
    // map still has to stay bounded: drop the oldest insertions.
    while (identityCache.size >= CACHE_MAX_ENTRIES) {
        const oldest = identityCache.keys().next().value;
        if (oldest === undefined) break;
        identityCache.delete(oldest);
    }
}

function toIdentity(identity: Awaited<ReturnType<typeof whoami>>): ConnectionIdentity {
    const capabilities = { ...NO_PRIVILEGES, ...identity.capabilities };
    return {
        userId: identity.user.id,
        displayName:
            identity.user.fullName
            || identity.user.username
            || identity.user.email
            || identity.user.id,
        username: identity.user.username,
        role: identity.mcpRole === 'moderator' ? 'moderator' : 'user',
        capabilities,
    };
}

/**
 * Resolve, and cache, the identity behind an access token.
 *
 * The caller must already be inside `runWithAccessToken`, because the lookup is
 * an authenticated API call. A failure propagates: the connection cannot be
 * treated as authenticated when its identity cannot be established, and every
 * tool would fail on the same API anyway.
 */
export async function resolveConnectionIdentity(token: string): Promise<ConnectionIdentity> {
    const now = Date.now();
    const cached = identityCache.get(cacheKey(token));
    if (cached && cached.expiresAt > now) return cached.identity;

    const identity = toIdentity(await whoami());
    pruneCache(now);
    identityCache.set(cacheKey(token), { identity, expiresAt: now + CACHE_TTL_MS });
    logger.info('Resolved MCP identity', { userId: identity.userId, role: identity.role });
    return identity;
}

/** Test-only: clears the identity cache. */
export function clearIdentityCacheForTests(): void {
    identityCache.clear();
}
