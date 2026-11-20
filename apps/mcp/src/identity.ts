import { whoami } from './api/identity.js';
import { currentAccessToken } from './http/token.js';

/**
 * Who this MCP connection is acting as, and what that account may do.
 *
 * ChatGPT and Claude pick tools from the list the server advertises, so the
 * role has to be known *before* the tool list is built. `worker.ts` resolves
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

// OpenSEO resolves identity from token props plus a local membership read, with
// no HTTP hop per MCP message. This worker has no database, so cache the API's
// answer briefly by token hash: one whoami per token per minute instead of one
// per initialize / tools/list / ping / tool call. RBAC changes still land within
// the TTL, and a revoked token's cached identity dies with the isolate.
const IDENTITY_TTL_MS = 60_000;
const IDENTITY_CACHE_MAX_KEYS = 2_000;
const identityCache = new Map<string, { identity: ConnectionIdentity; expiresAt: number }>();

/** Hash the opaque token so the cache never holds a credential. */
async function tokenKey(token: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
    return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Resolve the current identity for one HTTP request.
 *
 * The caller must already be inside `runWithAccessToken`. A cached identity is
 * keyed by the token itself, so one caller can never observe another's role.
 * A failure propagates; an unverified identity is never assumed.
 */
export async function resolveConnectionIdentity(): Promise<ConnectionIdentity> {
    const token = currentAccessToken();
    // Without a request-scoped token, let whoami() raise the proper 401.
    if (!token) return toIdentity(await whoami());

    const key = await tokenKey(token);
    const cached = identityCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.identity;

    const identity = toIdentity(await whoami());
    if (identityCache.size >= IDENTITY_CACHE_MAX_KEYS) {
        const oldest = identityCache.keys().next().value;
        if (oldest !== undefined) identityCache.delete(oldest);
    }
    identityCache.set(key, { identity, expiresAt: Date.now() + IDENTITY_TTL_MS });
    return identity;
}
