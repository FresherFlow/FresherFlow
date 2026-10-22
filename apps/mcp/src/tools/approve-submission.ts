import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { approveSubmissionTool } from '../api/submissions.js';

/**
 * Write tool: publish a reviewed submission.
 *
 * Requires opportunity.publish on the signed-in account — the same key the
 * admin UI requires, checked against the same RBAC tables. Publishing fires
 * alerts, feed refresh and the submitter's notification, so the description
 * insists the user ask for it explicitly.
 */
export function registerApproveSubmission(server: McpServer): void {
    server.registerTool(
        'approve_submission',
        {
            title: 'Approve a submission and publish it',
            description:
                'Publish a pending community submission. Use only when a moderator explicitly asks to '
                + 'approve that specific submission — never on your own judgement and never for several '
                + 'rows in one sweep without being asked. Get the id from review_queue first. Approval '
                + 'makes the listing live on FresherFlow, notifies the submitter and refreshes public '
                + 'feeds. Requires the opportunity.publish permission. Report the result exactly: a '
                + 'listing is only live if the response says published: true.',
            inputSchema: {
                submissionId: z
                    .string()
                    .trim()
                    .min(1)
                    .describe('The submission id from review_queue, not the listing id or slug.'),
            },
            outputSchema: {
                success: z.boolean(),
                submissionId: z.string(),
                opportunityId: z.string().optional(),
                slug: z.string().nullable().optional(),
                published: z.boolean(),
                message: z.string(),
            },
            annotations: {
                readOnlyHint: false,
                openWorldHint: false,
                destructiveHint: false,
            },
        },
        async ({ submissionId }) => {
            const result = await approveSubmissionTool(submissionId);
            return {
                structuredContent: result,
                content: [{ type: 'text' as const, text: result.message }],
            };
        },
    );
}
