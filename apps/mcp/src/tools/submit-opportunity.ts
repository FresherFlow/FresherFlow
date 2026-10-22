import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { SubmitOpportunityInput } from '../schemas.js';
import { submitOpportunity } from '../api/submissions.js';

const OUTPUT_SHAPE = {
  submissionId: z.string(),
  slug: z.string().nullable(),
  status: z.enum(['DRAFT', 'PUBLISHED']).describe(
    'DRAFT: waiting for a moderator. PUBLISHED: live on FresherFlow.',
  ),
  published: z.boolean().describe('true only when the listing is live right now'),
  duplicate: z.boolean().optional().describe('true when this job URL already existed'),
  message: z.string(),
};

// WRITE tool:
// - readOnlyHint: false (it changes FresherFlow state)
// - destructiveHint: false (nothing is destroyed)
// - openWorldHint: false (writes to our own bounded database; the server
//   never fetches the supplied URL)
//
// The description is explicit that the response decides whether the job is
// live, so an AI agent can never falsely tell a user their job is published.
export function registerSubmitOpportunity(server: McpServer): void {
  server.registerTool(
    'submit_opportunity',
    {
      title: 'Submit an opportunity',
      description:
        'Add a fresher job, internship, walk-in drive or government vacancy to FresherFlow. ' +
        'Use this whenever someone asks to add, post or list a job on FresherFlow, including when ' +
        'they only share a link. ' +
        'READ THE POSTING FIRST and fill in every field you can see — title, company, jobUrl, ' +
        'location, employmentType, category, salary, description, eligibility, skills and ' +
        'passoutYears. The more you send, the more of the listing survives; a title, company and ' +
        'URL alone produce a listing a moderator has to complete by hand. ' +
        'For a dated walk-in drive send category "walkin" plus dates and venueAddress; for a ' +
        'government vacancy send category "government". ' +
        'WHETHER IT GOES LIVE DEPENDS ON THE ACCOUNT: a moderator\'s submission is published ' +
        'immediately, while every other account\'s submission is saved as a DRAFT that a moderator ' +
        'must publish. Tell the user which one applies before they submit if they ask, and report ' +
        'the result from the `status` and `published` fields — a DRAFT is not live, and no job is ' +
        'live unless published is true. If the response says the URL already existed, that ' +
        'describes the pre-existing listing, not this one. ' +
        'The jobUrl is stored as data only; FresherFlow does not fetch it, so check the posting ' +
        'yourself before calling and never claim FresherFlow verified it.',
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
        skills: SubmitOpportunityInput.shape.skills,
        passoutYears: SubmitOpportunityInput.shape.passoutYears,
        sourceUrl: SubmitOpportunityInput.shape.sourceUrl,
        contactEmail: SubmitOpportunityInput.shape.contactEmail,
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
