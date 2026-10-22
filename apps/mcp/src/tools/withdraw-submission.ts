import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { withdrawSubmission } from '../api/submissions.js';

/**
 * Write tool: take back a submission the user changed their mind about.
 *
 * destructiveHint is true: withdrawing removes the unpublished listing. It is
 * scoped to the caller's own rows and refuses anything already live, so it can
 * never be used to unpublish someone else's job.
 */
export function registerWithdrawSubmission(server: McpServer): void {
    server.registerTool(
        'withdraw_submission',
        {
            title: 'Withdraw one of my submissions',
            description:
                'Withdraw a submission this account made that is still awaiting moderator review. '
                + 'Use only when the user explicitly asks to remove or cancel something they submitted '
                + '— never on your own initiative. Get the submissionId from list_my_submissions first. '
                + 'The unpublished listing is removed and the submission is closed. A listing that is '
                + 'already live CANNOT be withdrawn here: tell the user a moderator must remove it. '
                + 'Never claim it was removed unless the response says success.',
            inputSchema: {
                submissionId: z
                    .string()
                    .trim()
                    .min(1)
                    .describe('The submission id from list_my_submissions, not a listing slug.'),
            },
            outputSchema: {
                success: z.boolean(),
                submissionId: z.string(),
                listingState: z.enum(['archived', 'none']),
                message: z.string(),
            },
            annotations: {
                readOnlyHint: false,
                openWorldHint: false,
                destructiveHint: true,
            },
        },
        async ({ submissionId }) => {
            const result = await withdrawSubmission(submissionId);
            return {
                structuredContent: result,
                content: [{ type: 'text' as const, text: result.message }],
            };
        },
    );
}
