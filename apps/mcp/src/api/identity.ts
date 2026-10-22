import { apiFetch } from '../http/client.js';

/**
 * Who the connection is acting as, and what that account may do.
 *
 * This is the endpoint the transport calls before it builds a tool list, so it
 * is the source of the role used everywhere else in this server.
 */

/** What the connected account is allowed to do. Keys describe behaviour. */
export type McpCapabilities = {
    browseJobs: boolean;
    submitOpportunity: boolean;
    /** true for a moderator: their submission is published, not drafted. */
    submitPublishes: boolean;
    viewOwnSubmissions: boolean;
    withdrawOwnSubmission: boolean;
    reviewSubmissions: boolean;
    approveSubmissions: boolean;
    createFullListing: boolean;
    editFullListing: boolean;
};

/** Who the connection is signed in as, and what that account may do. */
export type McpIdentity = {
    signedIn: boolean;
    /** The two roles this surface has. Everything else is derived from it. */
    mcpRole: 'moderator' | 'user';
    user: {
        id: string;
        username: string | null;
        fullName: string | null;
        email: string | null;
        role: string;
        trustLevel: string | null;
        status: string;
    };
    permissions: string[];
    capabilities: McpCapabilities;
};

export async function whoami(): Promise<McpIdentity> {
    return apiFetch<McpIdentity>('/api/internal/mcp/whoami');
}
