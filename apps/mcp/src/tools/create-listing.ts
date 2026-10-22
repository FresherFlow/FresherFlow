import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createListing } from '../api/listings.js';

/**
 * Write tool. `payload` is a passthrough object rather than a mirrored copy of
 * the admin schema: duplicating ~150 fields here is exactly how the agent ends
 * up guessing a contract that has already drifted. Call get_listing_schema
 * first and build the payload from that response.
 *
 * Annotations:
 * - readOnlyHint: false (it writes a listing)
 * - destructiveHint: false (creates; the update-existing duplicate path only
 *   ever touches a DRAFT, never a published listing)
 * - openWorldHint: false (writes to our own bounded database)
 */
export function registerCreateListing(server: McpServer): void {
    server.registerTool(
        'create_listing',
        {
            title: 'Create a full listing',
            description:
                'Create a complete FresherFlow listing from the full admin field set — the same '
                + 'contract the admin form uses. Use this when the user wants a job actually added '
                + 'to the site, rather than merely flagged for review. '
                + 'WORKFLOW: call get_listing_schema first, build `payload` from that contract, then '
                + 'call this. Do not invent field names: the payload is validated against a closed '
                + 'schema and unrecognised keys are dropped without warning. '
                + 'NON-JOB LISTINGS NEED applyLink or sourceLink; walk-in drives additionally need '
                + 'driveDetails with a venueAddress. '
                + 'DUPLICATES: by default a repeat submit of the same URL updates the existing '
                + 'pending draft instead of failing, and refuses to overwrite a listing that is '
                + 'already published — the response says which happened via `created` and '
                + '`updatedExisting`. '
                + 'PUBLISHING: this tool is only available to a moderator connection, and `status` '
                + 'defaults to PUBLISHED for one — it goes live and sends alerts. Pass DRAFT when the '
                + 'user wants it staged for review instead. '
                + 'Never tell the user a listing is live unless the response reports published: true.',
            inputSchema: {
                payload: z
                    .record(z.string(), z.unknown())
                    .describe(
                        'The complete listing, matching the contract from get_listing_schema. '
                        + 'Must include title, company and requiredSkills; include applyLink or '
                        + 'sourceLink for anything that is not a walk-in.',
                    ),
                status: z
                    .enum(['DRAFT', 'PUBLISHED'])
                    .optional()
                    .describe(
                        'PUBLISHED (default for this moderator connection) goes live immediately and '
                        + 'triggers alerts. DRAFT stages it for review instead of publishing.',
                    ),
                onDuplicate: z
                    .enum(['update-existing', 'reject'])
                    .optional()
                    .describe(
                        'What to do when the applyLink/sourceLink already exists. '
                        + 'update-existing (default) updates a pending draft and refuses to touch a '
                        + 'published listing. reject returns a 409 conflict.',
                    ),
            },
            outputSchema: {
                success: z.boolean(),
                created: z.boolean().describe('true when a new row was written'),
                updatedExisting: z.boolean().describe('true when an existing pending draft was updated'),
                published: z.boolean().describe('true only when the listing is live on FresherFlow'),
                message: z.string(),
                listing: z.record(z.string(), z.unknown()).describe('The stored listing, as saved'),
            },
            annotations: {
                readOnlyHint: false,
                openWorldHint: false,
                destructiveHint: false,
            },
        },
        async ({ payload, status, onDuplicate }) => {
            const result = await createListing({
                payload,
                ...(status ? { options: { status } } : {}),
                ...(onDuplicate ? { options: { ...(status ? { status } : {}), onDuplicate } } : {}),
            });
            return {
                structuredContent: result,
                content: [
                    {
                        type: 'text' as const,
                        text: `${result.message} [listing ${String(result.listing?.slug ?? result.listing?.id)}]`,
                    },
                ],
            };
        },
    );
}