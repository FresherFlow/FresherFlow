import type { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { withdrawSubmission } from '../api/submissions.js';

const OUTPUT_SCHEMA = z.object({
    success: z.boolean(),
    submissionId: z.string(),
    listingState: z.enum(['archived', 'none']),
    message: z.string(),
});

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
                + 'Get the submissionId from list_my_submissions. The unpublished listing is removed '
                + 'and the submission is closed; success: true confirms it. A submission whose listing '
                + 'is already live cannot be withdrawn here and returns an error — a moderator must '
                + 'remove it.',
            inputSchema: z.object({
                            submissionId: z
                                .string()
                                .trim()
                                .min(1)
                                .describe('The submission id from list_my_submissions, not a listing slug.'),
                        }),
            outputSchema: OUTPUT_SCHEMA,
            annotations: {
                readOnlyHint: false,
                openWorldHint: false,
                destructiveHint: true,
            },
        },
        async ({ submissionId }) => {
            const result = OUTPUT_SCHEMA.parse(await withdrawSubmission(submissionId));
            return {
                structuredContent: result,
                content: [{ type: 'text' as const, text: result.message }],
            };
        },
    );
}
