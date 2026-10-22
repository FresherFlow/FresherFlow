import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { rejectSubmissionTool } from '../api/submissions.js';

/**
 * Write tool: reject a submission.
 *
 * destructiveHint is true: rejecting archives the listing and marks the
 * submission rejected, which the contributor sees in their history. The reason
 * is passed through to them, so the description asks the agent to give a real
 * one rather than a placeholder.
 */
export function registerRejectSubmission(server: McpServer): void {
    server.registerTool(
        'reject_submission',
        {
            title: 'Reject a submission',
            description:
                'Reject a submission awaiting review. Use only when a moderator explicitly asks to '
                + 'reject that specific submission. Get the id from review_queue first. Rejecting '
                + 'archives the linked listing so it never goes live and marks the submission rejected; '
                + 'the reason is shown to the contributor in their submission history. Requires the '
                + 'opportunity.review permission. Pass a concrete reason the contributor can act on '
                + '(wrong details, expired posting, duplicate, not a fresher role) — do not say '
                + '"rejected" and nothing else.',
            inputSchema: {
                submissionId: z
                    .string()
                    .trim()
                    .min(1)
                    .describe('The submission id from review_queue, not the listing id or slug.'),
                reason: z
                    .string()
                    .trim()
                    .max(500)
                    .optional()
                    .describe('Why it was rejected, shown to the contributor. Be specific and factual.'),
            },
            outputSchema: {
                success: z.boolean(),
                submissionId: z.string(),
                published: z.boolean(),
                message: z.string(),
            },
            annotations: {
                readOnlyHint: false,
                openWorldHint: false,
                destructiveHint: true,
            },
        },
        async ({ submissionId, reason }) => {
            const result = await rejectSubmissionTool(submissionId, reason);
            return {
                structuredContent: result,
                content: [
                    {
                        type: 'text' as const,
                        text: reason ? `${result.message} Reason given: ${reason}` : result.message,
                    },
                ],
            };
        },
    );
}
