import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { JOB_CARDS_URI } from '../widget/job-cards-resource.js';
import { jobSchema } from './get-job.js';

const inputSchema = z.object({
  job: jobSchema.describe('The job object from a get_job result, passed unchanged. Fetches nothing.'),
});

const outputSchema = z.object({
  displayed: z.literal(true),
  view: z.literal('detail'),
});

/** Display-only re-render of public get_job data. */
export function registerShowJobDetail(server: McpServer): void {
  server.registerTool(
    'show_job_detail',
    {
      title: 'Show FresherFlow job details',
      description:
        'Call get_job first and pass its job object unchanged. Shows the full job detail view; fetches nothing. '
        + 'Skip it when plain text is enough. Do not restate the widget contents in text.',
      inputSchema,
      outputSchema,
      annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
      _meta: { ui: { resourceUri: JOB_CARDS_URI } },
    },
    async ({ job }: z.infer<typeof inputSchema>) => ({
      structuredContent: { displayed: true as const, view: 'detail' as const },
      content: [{ type: 'text' as const, text: `Showing details for ${job.title}.` }],
      _meta: { fresherflowWidget: { view: 'detail', kind: 'tool-result', data: job } },
    }),
  );
}
