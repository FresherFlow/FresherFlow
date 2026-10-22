import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { updateListing } from '../api/listings.js';

/**
 * Write tool. Updates in place by id or slug — never creates a second row for
 * the same job.
 *
 * Annotations:
 * - readOnlyHint: false (it writes a listing)
 * - destructiveHint: false (edits an existing listing; it cannot delete)
 * - openWorldHint: false (writes to our own bounded database)
 */
export function registerUpdateListing(server: McpServer): void {
    server.registerTool(
        'update_listing',
        {
            title: 'Update a listing',
            description:
                'Update an existing FresherFlow listing in place, addressed by its id or slug. '
                + 'Use this to correct fields, refresh details, or change the status of a listing '
                + 'you already created — it never creates a duplicate row. '
                + 'WORKFLOW: call get_listing first to read the current listing, change only what '
                + 'needs changing, then call get_listing_schema and send the COMPLETE payload here. '
                + 'This is a full replace, not a patch: any field you leave out is cleared, so '
                + 'always read the listing first rather than sending a fragment. '
                + 'Status must be one of DRAFT, PUBLISHED or ARCHIVED — EXPIRED is not accepted, '
                + 'use ARCHIVED instead. Passing status PUBLISHED on a draft publishes it and '
                + 'triggers alerts.',
            inputSchema: {
                idOrSlug: z
                    .string()
                    .trim()
                    .min(1)
                    .describe('The listing id or slug, e.g. "software-engineer-at-acme-1a2b3c4d"'),
                payload: z
                    .record(z.string(), z.unknown())
                    .describe(
                        'The complete listing after your changes, matching the contract from '
                        + 'get_listing_schema. Must include title, company and requiredSkills, and '
                        + 'applyLink or sourceLink for anything that is not a walk-in.',
                    ),
            },
            outputSchema: {
                success: z.boolean(),
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
        async ({ idOrSlug, payload }) => {
            const result = await updateListing(idOrSlug, payload);
            return {
                structuredContent: result,
                content: [{ type: 'text' as const, text: result.message }],
            };
        },
    );
}