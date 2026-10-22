import { apiFetch, jsonHeaders } from '../http/client.js';

/**
 * Full listing surface (`/api/internal/mcp/listings`).
 *
 * Moderator-only at the API: `opportunity.create` or `opportunity.edit` is
 * required, and the server only registers these tools for a caller that holds
 * one of them.
 *
 * Type aliases, not interfaces: the MCP SDK requires `structuredContent` to
 * satisfy `{ [x: string]: unknown }`, which an interface does not.
 */

export type ListingSchemaResponse = {
    schema: Record<string, unknown>;
    enums: Record<string, string[]>;
    rules: Record<string, string | string[]>;
};

export interface CreateListingBody {
    payload: Record<string, unknown>;
    options?: { status?: 'DRAFT' | 'PUBLISHED'; onDuplicate?: 'reject' | 'update-existing' };
}

export type ListingWriteResponse = {
    success: boolean;
    created?: boolean;
    updatedExisting?: boolean;
    published: boolean;
    message: string;
    listing: Record<string, unknown>;
};

/** Read the live contract: field names, required fields and enum vocabularies. */
export async function getListingSchema(): Promise<ListingSchemaResponse> {
    return apiFetch<ListingSchemaResponse>('/api/internal/mcp/schema', {
        headers: jsonHeaders(),
    });
}

/**
 * Create a full listing.
 *
 * `status` is decided by the API from the caller's role: PUBLISHED for a
 * moderator, DRAFT for the pipeline's service key. Omit it and the API decides.
 */
export async function createListing(
    body: CreateListingBody,
): Promise<ListingWriteResponse> {
    return apiFetch<ListingWriteResponse>('/api/internal/mcp/listings', {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify(body),
    });
}

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
