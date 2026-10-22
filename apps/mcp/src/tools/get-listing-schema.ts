import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getListingSchema } from '../api/listings.js';

/**
 * Read tool: lets an agent discover the backend contract instead of assuming
 * one. The schema is generated from the same Zod object the admin form is
 * validated against, so it cannot drift from what the API accepts.
 *
 * Annotations:
 * - readOnlyHint: true (it only describes the contract)
 * - openWorldHint: false (it reads our own bounded service)
 */
export function registerGetListingSchema(server: McpServer): void {
    server.registerTool(
        'get_listing_schema',
        {
            title: 'Get the listing schema',
            description:
                'Return the exact field contract for creating or updating a FresherFlow listing: '
                + 'every accepted field name, which fields are required, and the valid values for '
                + 'every enum (category, status, workMode, salaryPeriod, allowedDegrees, '
                + 'allowedAvailability, employmentTypes). Call this BEFORE building a payload for '
                + 'create_listing or update_listing — the payload object is validated strictly, and '
                + 'unknown field names are silently discarded. The response also carries the rules '
                + 'that are not visible from field names alone, such as government jobs travelling '
                + 'via governmentJobDetails rather than a category value.',
            inputSchema: {},
            outputSchema: {
                schema: z.record(z.string(), z.unknown()),
                enums: z.record(z.string(), z.array(z.string())),
                rules: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
            },
            annotations: {
                readOnlyHint: true,
                openWorldHint: false,
                destructiveHint: false,
            },
        },
        async () => {
            const result = await getListingSchema();
            return {
                structuredContent: result,
                content: [
                    {
                        type: 'text' as const,
                        text:
                            `Listing contract: ${Object.keys(result.enums).length} enum vocabularies. `
                            + `Required fields: ${(result.rules.required as string[]).join(', ')}. `
                            + 'Build the payload from the schema, then call create_listing.',
                    },
                ],
            };
        },
    );
}