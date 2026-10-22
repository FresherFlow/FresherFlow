import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { listMySubmissions } from '../api/submissions.js';

const SUBMISSION_SHAPE = {
    id: z.string(),
    title: z.string().nullable(),
    company: z.string().nullable(),
    sourceUrl: z.string().nullable(),
    applyUrl: z.string().nullable(),
    status: z.string(),
    createdAt: z.string(),
    opportunityId: z.string().nullable(),
    extractedData: z.record(z.string(), z.unknown()).nullable().optional(),
    opportunity: z
        .object({
            id: z.string(),
            slug: z.string().nullable(),
            status: z.string(),
            deletedAt: z.string().nullable(),
            deletionReason: z.string().nullable(),
        })
        .nullable()
        .optional(),
};

/**
 * Read tool: the caller's own submission history.
 *
 * Scoped by the token on the server side, so this can never show another user's
 * submissions. It is how the agent answers "did my job go live?" with the real
 * row state rather than guessing from the submit response.
 */
export function registerListMySubmissions(server: McpServer): void {
    server.registerTool(
        'list_my_submissions',
        {
            title: 'List my FresherFlow submissions',
            description:
                'List what THIS signed-in user has submitted to FresherFlow, newest first, with each '
                + 'submission\'s moderation state (PENDING_REVIEW, PUBLISHED, REJECTED, MERGED) and the '
                + 'linked listing when there is one. Use it to answer "did my job get posted?", to find '
                + 'the submissionId for withdraw_submission, or instead of re-submitting the same job. '
                + 'An empty list means this account has not submitted anything yet.',
            inputSchema: {
                status: z
                    .enum(['PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'MERGED'])
                    .optional()
                    .describe('Optional filter. Omit to see the full history.'),
            },
            outputSchema: {
                submissions: z.array(z.object(SUBMISSION_SHAPE)),
                total: z.number(),
                status: z.string(),
            },
            annotations: {
                readOnlyHint: true,
                openWorldHint: false,
                destructiveHint: false,
            },
        },
        async ({ status }) => {
            const result = await listMySubmissions(status);
            return {
                structuredContent: result,
                content: [
                    {
                        type: 'text' as const,
                        text: result.total === 0
                            ? 'No submissions from this account.'
                            : result.submissions
                                .map((s) => `${s.id} — ${s.title ?? '(untitled)'} at ${s.company ?? '(unknown)'} — ${s.status}`)
                                .join('\n'),
                    },
                ],
            };
        },
    );
}
