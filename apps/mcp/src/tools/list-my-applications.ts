import type { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { listMyApplications, type ApplicationStage } from '../api/account.js';

const APPLICATION_SHAPE = z.object({
    id: z.string(),
    stage: z.string().describe('Current funnel stage, e.g. APPLIED, INTERVIEW, OFFERED, REJECTED'),
    appliedAt: z.string().nullable(),
    updatedAt: z.string().nullable(),
    opportunity: z
        .object({
            id: z.string(),
            slug: z.string().nullable(),
            title: z.string(),
            company: z.string(),
            locations: z.array(z.string()),
            expiresAt: z.string().nullable(),
            url: z.string().nullable(),
        })
        .nullable(),
});

const OUTPUT_SCHEMA = z.object({
    applications: z.array(APPLICATION_SHAPE),
    total: z.number(),
    page: z.number(),
    hasMore: z.boolean(),
});

const STAGES = [
    'APPLIED', 'REGISTERED', 'IN_REVIEW', 'ASSESSMENT', 'INTERVIEW',
    'OFFERED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'SKIPPED', 'PARTICIPATED',
] as const;

/**
 * Read tool: the caller's application records.
 *
 * FresherFlow tracks the funnel (`OpportunityApplication`), and the jobs the user
 * applied to are not recoverable from the public feed. Without this the agent
 * cannot answer "where did I apply?" or "did that company get back to me?".
 * It reads only; applying and withdrawing stay on the website's own flow.
 */
export function registerListMyApplications(server: McpServer, siteUrl: string): void {
    server.registerTool(
        'list_my_applications',
        {
            title: 'List my FresherFlow applications',
            description:
                'List THIS signed-in user\'s FresherFlow application records, newest first, with the current stage '
                + '(APPLIED, REGISTERED, IN_REVIEW, ASSESSMENT, INTERVIEW, OFFERED, ACCEPTED, REJECTED, WITHDRAWN, '
                + 'SKIPPED, PARTICIPATED), when they applied, and the linked listing with its canonical URL. '
                + 'Use it for "where did I apply?", "what is the status of my applications?" and "any offers?". '
                + 'Read-only: it cannot apply, advance a stage or withdraw — those happen on FresherFlow itself. '
                + 'An empty list means this account has no application records yet.',
            inputSchema: z.object({
                stage: z
                    .enum(STAGES)
                    .optional()
                    .describe('Optional funnel stage filter. Omit to see every application.'),
                limit: z
                    .number()
                    .int()
                    .min(1)
                    .max(50)
                    .optional()
                    .describe('How many records to return, default 20'),
            }),
            outputSchema: OUTPUT_SCHEMA,
            annotations: {
                readOnlyHint: true,
                openWorldHint: false,
                destructiveHint: false,
            },
        },
        async ({ stage, limit }) => {
            const result = await listMyApplications(siteUrl, {
                ...(stage ? { stage: stage as ApplicationStage } : {}),
                ...(limit ? { limit } : {}),
            });
            const preview = result.applications.slice(0, 10).map(
                (application) => `- ${application.opportunity?.title ?? 'Listing removed'} at `
                    + `${application.opportunity?.company ?? 'unknown'} — ${application.stage}`
                    + (application.opportunity?.url ? ` — ${application.opportunity.url}` : ''),
            );
            return {
                structuredContent: result,
                content: [{
                    type: 'text' as const,
                    text: result.applications.length === 0
                        ? 'No FresherFlow application records on this account.'
                        : `${result.total} application${result.total === 1 ? '' : 's'}:\n${preview.join('\n')}`
                            + (result.hasMore ? `\n(More available — ask for page ${result.page + 1}.)` : ''),
                }],
            };
        },
    );
}
