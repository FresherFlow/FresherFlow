import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { SubmitOpportunityInput } from '../schemas.js';
import { submitOpportunity } from '../apiClient.js';

const OUTPUT_SHAPE = {
  submissionId: z.string(),
  slug: z.string().nullable(),
  status: z.enum(['PENDING_REVIEW', 'PUBLISHED']),
  published: z.boolean(),
  message: z.string(),
};

// Anonymous WRITE tool:
// - readOnlyHint: false (it changes FresherFlow state)
// - destructiveHint: false (not irreversible — submissions sit in
//   PENDING_REVIEW and are never published without moderator approval)
// - openWorldHint: false (writes to our own bounded database; the server
//   never fetches the supplied URL)
//
// The description is explicit that submission != publication so an AI agent
// can never falsely tell a user their job is live.
export function registerSubmitOpportunity(server: McpServer): void {
  server.registerTool(
    'submit_opportunity',
    {
      title: 'Submit an opportunity',
      description:
        'Submit a fresher job or internship to FresherFlow for review. ' +
        'Use when a user shares a job link they want added to the platform. ' +
        'IMPORTANT: a new submission only stages the opportunity for review — it is NOT published ' +
        'until a moderator approves it. Do not tell the user a new submission is live. ' +
        'If the response says the URL is already live, that describes the pre-existing listing. ' +
        'The jobUrl is stored as data only; FresherFlow does not fetch it.',
      inputSchema: {
        title: SubmitOpportunityInput.shape.title,
        companyName: SubmitOpportunityInput.shape.companyName,
        jobUrl: SubmitOpportunityInput.shape.jobUrl,
        location: SubmitOpportunityInput.shape.location,
        employmentType: SubmitOpportunityInput.shape.employmentType,
        category: SubmitOpportunityInput.shape.category,
        dates: SubmitOpportunityInput.shape.dates,
        dateRange: SubmitOpportunityInput.shape.dateRange,
        timeRange: SubmitOpportunityInput.shape.timeRange,
        venueAddress: SubmitOpportunityInput.shape.venueAddress,
        salary: SubmitOpportunityInput.shape.salary,
        description: SubmitOpportunityInput.shape.description,
        eligibility: SubmitOpportunityInput.shape.eligibility,
        sourceUrl: SubmitOpportunityInput.shape.sourceUrl,
        contactEmail: SubmitOpportunityInput.shape.contactEmail,
        submitKey: SubmitOpportunityInput.shape.submitKey,
      },
      outputSchema: OUTPUT_SHAPE,
      annotations: {
        readOnlyHint: false,
        openWorldHint: false,
        destructiveHint: false,
      },
    },
    async (input: SubmitOpportunityInput) => {
      // Parse here (not just in the SDK layer) so refinements such as the
      // HTTPS-only jobUrl/sourceUrl rule are enforced before any upstream call.
      const parsed = SubmitOpportunityInput.parse(input);
      const result = await submitOpportunity(parsed);
      // The server owns the verdict (new / duplicate-live / duplicate-pending);
      // surface it verbatim with the reference id so bulk dumps are auditable
      // link by link.
      return {
        structuredContent: result,
        content: [
          {
            type: 'text' as const,
            text: `${result.message} [submission ${result.submissionId}]`,
          },
        ],
      };
    },
  );
}
