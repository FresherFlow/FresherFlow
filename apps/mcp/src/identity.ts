import { whoami } from './api/identity.js';

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

/**
 * Resolve the current identity for one HTTP request.
 *
 * The caller must already be inside `runWithAccessToken`, because the lookup is
 * an authenticated API call. Resolving on every request ensures expired tokens,
 * suspended accounts, and changed RBAC grants take effect before the tool list
 * is built. A failure propagates; an unverified identity is never assumed.
 */
export async function resolveConnectionIdentity(): Promise<ConnectionIdentity> {
    return toIdentity(await whoami());
}
