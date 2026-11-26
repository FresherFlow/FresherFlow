import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { JOB_CARDS_URI } from '../widget/job-cards-resource.js';
import { JOB_SUMMARY_SHAPE } from './get-jobs.js';

const inputSchema = z.object({
  found: z.boolean(),
  company: z
    .object({ name: z.string(), slug: z.string(), url: z.string().nullable(), logoUrl: z.string().nullable() })
    .nullable(),
  pageUrl: z.string().nullable(),
  hasLiveJobs: z.boolean(),
  total: z.number(),
  returned: z.number(),
  truncated: z.boolean(),
  jobs: z.array(z.object(JOB_SUMMARY_SHAPE)),
}).describe('The complete result of get_company_jobs, passed unchanged. Fetches nothing.');

const outputSchema = z.object({
  displayed: z.literal(true),
  view: z.literal('company'),
});

/** Display-only re-render of public get_company_jobs data. */
export function registerShowCompany(server: McpServer): void {
  server.registerTool(
    'show_company',
    {
      title: 'Show a FresherFlow company',
      description:
        'Call get_company_jobs first and pass its result unchanged. Shows the company identity and its live jobs. '
        + 'Fetches nothing. Skip it when plain text is enough. Do not restate the widget contents in text.',
      inputSchema,
      outputSchema,
      annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
      _meta: { ui: { resourceUri: JOB_CARDS_URI } },
    },
    async (args: z.infer<typeof inputSchema>) => ({
      structuredContent: { displayed: true as const, view: 'company' as const },
      content: [{ type: 'text' as const, text: `Showing ${args.total} live jobs for ${args.company?.name ?? 'this company'}.` }],
      _meta: { fresherflowWidget: { view: 'company', kind: 'tool-result', data: args } },
    }),
  );
}
