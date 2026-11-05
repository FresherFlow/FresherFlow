import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
    LISTING_TEMPLATE_KINDS,
    LISTING_TEMPLATE_RULES,
    getListingTemplate,
} from '../templates/listingTemplates.js';

/**
 * Read tool: the payload skeleton for create_listing, plus the content rules.
 *
 * It exists because the two write formats look alike and are not: the admin
 * form's paste-JSON uses `type` / `walkInDetails` / `salaryAmount`, while the
 * API's closed schema takes `category` / `driveDetails` / `salaryRange`. A
 * copied admin payload loses exactly the fields that make a walk-in usable.
 *
 * Annotations: readOnlyHint true, openWorldHint false.
 */
export function registerGetListingTemplate(server: McpServer): void {
    server.registerTool(
        'get_listing_template',
        {
            title: 'Get a ready-to-fill listing template',
            description:
                'Return an empty, API-correct payload for one kind of FresherFlow listing (JOB, '
                + 'INTERNSHIP or WALKIN) together with the content rules for filling it. Use this '
                + 'BEFORE create_listing or update_listing: the payload it returns uses the field '
                + 'names the API actually accepts (category, driveDetails, salaryRange/stipend). '
                + 'Do not copy the admin form\'s paste-JSON dialect — its `type`, `walkInDetails` '
                + 'and `salaryAmount` keys are silently dropped, which produces a walk-in with no '
                + 'venue and a job with no salary. Call get_listing_schema when you also need the '
                + 'enum vocabularies. Fill only what the posting actually states; leave the rest '
                + 'empty rather than inventing values.',
            inputSchema: {
                type: z
                    .enum(['JOB', 'INTERNSHIP', 'WALKIN', 'ALL'])
                    .describe('Which template to return. ALL returns every kind with the rules.'),
            },
            outputSchema: {
                templates: z.record(z.string(), z.record(z.string(), z.unknown())).describe(
                    'Payload skeletons keyed by kind, ready for create_listing.payload',
                ),
                rules: z.record(z.string(), z.string()).describe(
                    'Content and extraction rules to follow while filling the payload',
                ),
            },
            annotations: {
                readOnlyHint: true,
                openWorldHint: false,
                destructiveHint: false,
            },
        },
        async ({ type }) => {
            const kinds = type === 'ALL' ? LISTING_TEMPLATE_KINDS : [type];
            const templates: Record<string, Record<string, unknown>> = {};
            for (const kind of kinds) {
                templates[kind] = getListingTemplate(kind);
            }
            return {
                structuredContent: { templates, rules: LISTING_TEMPLATE_RULES },
                content: [
                    {
                        type: 'text' as const,
                        text: `${kinds.join(', ')} template ready. Required: title, company, requiredSkills`
                            + `${kinds.includes('WALKIN') ? '; walk-ins need driveDetails with a venueAddress' : '; add applyLink'}.`
                            + ' Rules cover description vs notesHighlights, skills, salary, locations and'
                            + ' applicationDetails. Fill from the posting only.',
                    },
                ],
            };
        },
    );
}
