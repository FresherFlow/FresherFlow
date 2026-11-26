import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { JOB_CARDS_URI } from '../widget/job-cards-resource.js';
import { JOB_SUMMARY_SHAPE } from './get-jobs.js';

const inputSchema = z.object({
  jobs: z
    .array(z.object(JOB_SUMMARY_SHAPE))
    .describe('The jobs array from a get_jobs result, passed unchanged. This tool fetches nothing.'),
});

const outputSchema = z.object({
  displayed: z.literal(true),
  count: z.number().int().nonnegative(),
});

type Args = z.infer<typeof inputSchema>;

/**
 * Display-only tool. Data comes from the caller's get_jobs result; the widget
 * receives the same array through result `_meta`, so nothing is re-fetched and
 * no second copy of the job shape can drift from get_jobs.
 */
export function registerShowJobCards(server: McpServer): void {
  server.registerTool(
    'show_job_cards',
    {
      title: 'Show FresherFlow job cards',
      description: 'Call get_jobs first and pass jobs; fetches nothing; skip when plain text is enough.',
      inputSchema,
      outputSchema,
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
        destructiveHint: false,
      },
      _meta: { ui: { resourceUri: JOB_CARDS_URI } },
    },
    async ({ jobs }: Args) => ({
      structuredContent: { displayed: true, count: jobs.length },
      content: [
        {
          type: 'text' as const,
          text: `Showing ${jobs.length} FresherFlow job card${jobs.length === 1 ? '' : 's'}.`,
        },
      ],
      _meta: {
        fresherflowJobCards: { jobs },
        fresherflowWidget: { view: 'cards', kind: 'tool-result', data: { jobs, total: jobs.length } },
      },
    }),
  );
}
