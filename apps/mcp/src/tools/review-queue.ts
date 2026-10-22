import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getReviewQueue } from '../api/submissions.js';

const QUEUE_ROW_SHAPE = {
    id: z.string(),
    title: z.string().nullable(),
    company: z.string().nullable(),
    sourceUrl: z.string().nullable(),
    applyUrl: z.string().nullable(),
    description: z.string().nullable().optional(),
    status: z.string(),
    createdAt: z.string(),
    opportunityId: z.string().nullable(),
    extractedData: z.record(z.string(), z.unknown()).nullable().optional(),
    submittedBy: z
        .object({
            id: z.string(),
            username: z.string().nullable(),
            fullName: z.string().nullable(),
        })
        .nullable()
        .optional(),
    opportunity: z
        .object({
            id: z.string(),
            slug: z.string().nullable(),
            title: z.string().nullable(),
            status: z.string(),
            deletedAt: z.string().nullable(),
        })
        .nullable()
        .optional(),
};

/**
 * Read tool: the moderation queue.
 *
 * Requires opportunity.review on the signed-in account. Reading the queue first
 * is what lets the agent summarize what is pending before acting, and gives it
 * the submissionIds that approve_submission / reject_submission take.
 */
export function registerReviewQueue(server: McpServer): void {
    server.registerTool(
        'review_queue',
        {
            title: 'Read the FresherFlow review queue',
            description:
                'List community submissions awaiting moderator review, newest first, plus how many are '
                + 'pending in total. Use it when a moderator asks what needs review, or before approving '
                + 'or rejecting anything — approve_submission and reject_submission take the submission '
                + 'id this returns (not the listing id). Reading the queue does not decide anything. '
                + 'This needs the opportunity.review permission; if it is refused, the user is not a '
                + 'moderator and you must not offer to approve anything.',
            inputSchema: {
                status: z
                    .enum(['PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'MERGED'])
                    .optional()
                    .describe('Optional filter. Defaults to PENDING_REVIEW, the queue that needs work.'),
            },
            outputSchema: {
                submissions: z.array(z.object(QUEUE_ROW_SHAPE)),
                pendingCount: z.number(),
                status: z.string(),
            },
            annotations: {
                readOnlyHint: true,
                openWorldHint: false,
                destructiveHint: false,
            },
        },
        async ({ status }) => {
            const result = await getReviewQueue(status);
            return {
                structuredContent: result,
                content: [
                    {
                        type: 'text' as const,
                        text: `${result.pendingCount} pending review; showing ${result.submissions.length} `
                            + `row(s) with status ${result.status}.`,
                    },
                ],
            };
        },
    );
}
