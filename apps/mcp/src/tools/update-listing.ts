import type { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { ListingPayload } from '../schemas.js';
import { updateListing } from '../api/listings.js';

const OUTPUT_SCHEMA = z.object({
    success: z.boolean(),
    published: z.boolean().describe('true only when the listing is live on FresherFlow'),
    message: z.string(),
    listing: z.record(z.string(), z.unknown()).describe('The stored listing, as saved'),
});

/**
 * Write tool. Updates in place by id or slug — never creates a second row for
 * the same job.
 *
 * Annotations:
 * - readOnlyHint: false (it writes a listing)
 * - destructiveHint: true (a full replace: omitted fields are cleared)
 * - openWorldHint: false (writes to our own bounded database)
 */
export function registerUpdateListing(server: McpServer): void {
    server.registerTool(
        'update_listing',
        {
            title: 'Update a listing',
            description:
                'Update an existing FresherFlow listing by id or slug. This is the only full-listing edit tool; it never creates a row — adding a job is submit_opportunity. '
                + 'WORKFLOW: call get_listing first, change only what needs changing, then send the COMPLETE payload here. This is a full replace: omitted fields are cleared. Call get_listing again to confirm what was stored. '
                + 'The exact field names, enums and rules are in the payload input schema — do not use the admin form\'s type / walkInDetails / salaryAmount keys; they are not API fields and are dropped silently. '
                + 'Never invent a value. Passing status PUBLISHED on a draft publishes it and triggers alerts. '
                + 'The API rejects with a 400 naming the field: placeholder title/company, a salary without a figure, duplicate skills, an unknown employment type, "Remote" in locations, an invalid or past expiresAt, and a non-https companyWebsite.',
            inputSchema: z.object({
                            idOrSlug: z
                                .string()
                                .trim()
                                .min(1)
                                .describe('The listing id or slug, e.g. "software-engineer-at-acme-1a2b3c4d"'),
                            payload: ListingPayload.describe(
                                'The complete listing after your changes. Required: title, company, requiredSkills, '
                                + 'and applyLink or sourceLink for anything that is not a walk-in.',
                            ),
                        }),
            outputSchema: OUTPUT_SCHEMA,
            annotations: {
                readOnlyHint: false,
                openWorldHint: false,
                destructiveHint: true,
            },
        },
        async ({ idOrSlug, payload }) => {
            const result = OUTPUT_SCHEMA.parse(await updateListing(idOrSlug, payload));
            return {
                structuredContent: result,
                content: [{ type: 'text' as const, text: result.message }],
            };
        },
    );
}