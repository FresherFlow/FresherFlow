import type { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { approveSubmissionTool } from '../api/submissions.js';

const OUTPUT_SCHEMA = z.object({
    success: z.boolean(),
    submissionId: z.string(),
    opportunityId: z.string().optional(),
    slug: z.string().nullable().optional(),
    published: z.boolean(),
    message: z.string(),
});

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
                'Publish one pending community submission. Get the submissionId from review_queue. '
                + 'Approval makes the listing live on FresherFlow and notifies the submitter. Requires '
                + 'the opportunity.publish permission. published: true is the only confirmation that '
                + 'the listing is live.',
            inputSchema: z.object({
                            submissionId: z
                                .string()
                                .trim()
                                .min(1)
                                .describe('The submission id from review_queue, not the listing id or slug.'),
                        }),
            outputSchema: OUTPUT_SCHEMA,
            annotations: {
                readOnlyHint: false,
                openWorldHint: true,
                // Claude asks only for destructiveHint: true tools, and approval
                // publishes a listing and notifies the submitter.
                destructiveHint: true,
            },
        },
        async ({ submissionId }) => {
            const result = OUTPUT_SCHEMA.parse(await approveSubmissionTool(submissionId));
            return {
                structuredContent: result,
                content: [{ type: 'text' as const, text: result.message }],
            };
        },
    );
}
