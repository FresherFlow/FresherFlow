import { apiFetch, jsonHeaders } from '../http/client.js';

/**
 * Full listing surface (`/api/internal/mcp/listings`).
 *
 * Moderator-only at the API: `update_listing` needs `opportunity.edit` (or
 * `opportunity.create`) and `get_listing` needs `opportunity.review`. The server
 * registers these tools only for a caller that holds the write grant.
 *
 * Type aliases, not interfaces: the MCP SDK requires `structuredContent` to
 * satisfy `{ [x: string]: unknown }`, which an interface does not.
 */

export type ListingWriteResponse = {
    success: boolean;
    created?: boolean;
    updatedExisting?: boolean;
    published: boolean;
    message: string;
    listing: Record<string, unknown>;
};

// The field contract lives in the `update_listing` tool description, not in a
// separate schema tool. The API still serves GET /api/internal/mcp/schema for
// non-MCP callers.

// There is deliberately no `createListing` here. Adding a job goes through
// `submit_opportunity`; the POST /api/internal/mcp/listings route exists for the
// pipeline's service key, not for an AI client. One creation path keeps the two
// write contracts from colliding.

/** Full replace of an existing listing. Sends the complete payload, not a diff. */
export async function updateListing(
    idOrSlug: string,
    payload: Record<string, unknown>,
): Promise<ListingWriteResponse> {
    return apiFetch<ListingWriteResponse>(
        `/api/internal/mcp/listings/${encodeURIComponent(idOrSlug)}`,
        {
            method: 'PUT',
            headers: jsonHeaders(),
            body: JSON.stringify(payload),
        },
    );
}

/** Read a listing back, to verify what was actually stored. */
export async function getListing(idOrSlug: string): Promise<Record<string, unknown>> {
    const data = await apiFetch<{ success: boolean; listing: Record<string, unknown> }>(
        `/api/internal/mcp/listings/${encodeURIComponent(idOrSlug)}`,
        { headers: jsonHeaders() },
    );
    return data.listing;
}
