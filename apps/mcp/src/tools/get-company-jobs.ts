import type { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { getCompanyJobs } from '../cdn/companies.js';
import { JOB_SUMMARY_SHAPE } from './get-jobs.js';

const OUTPUT_SCHEMA = z.object({
    found: z.boolean().describe('true when FresherFlow knows this company'),
    company: z
        .object({
            name: z.string(),
            slug: z.string(),
            url: z.string().nullable().describe("The company's own website, when known"),
            logoUrl: z.string().nullable(),
        })
        .nullable(),
    pageUrl: z.string().nullable().describe('Canonical FresherFlow company page'),
    hasLiveJobs: z.boolean().describe('true only when at least one live listing exists right now'),
    total: z.number().describe('Live listings for this company'),
    returned: z.number(),
    truncated: z.boolean().describe('true when more live listings exist than were returned'),
    jobs: z.array(z.object(JOB_SUMMARY_SHAPE)),
});

/**
 * Read tool: one company, exactly.
 *
 * This is the answer to "does <company> have jobs?", "what is open at
 * <company>?", and "send me the <company> hiring page". It reads that
 * company's own catalog file, so it is cheaper and more exact than filtering
 * the whole feed; `get_jobs` remains the cross-company search.
 */
export function registerGetCompanyJobs(server: McpServer, catalogBaseUrl: string, siteUrl = ''): void {
    server.registerTool(
        'get_company_jobs',
        {
            title: 'Check a company for live jobs',
            description:
                'Check one named company on FresherFlow: whether it is known, whether it has live jobs right now, its live listings, and its canonical company page. '
                + 'Use this whenever a user names a company ("does Infosys have openings?", "show me Amazon jobs", "is TCS hiring freshers?"). '
                + 'Accepts a company name or slug and matches exact slug, then exact name, then a name substring. '
                + '`found: false` means FresherFlow has no such company — say that plainly; `hasLiveJobs: false` with `found: true` means the company exists but nothing is live today. '
                + 'Read `total` and `truncated` together: listings are capped, and `truncated: true` means more live roles exist than are shown. '
                + 'For a broad search across companies, use get_jobs; for one listing, use get_job.',
            inputSchema: z.object({
                company: z
                    .string()
                    .trim()
                    .min(1)
                    .max(120)
                    .describe('Company name or slug, e.g. "Infosys", "Infosys Limited", or "infosys"'),
            }),
            outputSchema: OUTPUT_SCHEMA,
            annotations: {
                readOnlyHint: true,
                openWorldHint: false,
                destructiveHint: false,
                idempotentHint: true,
            },
        },
        async ({ company }) => {
            const result = OUTPUT_SCHEMA.parse(await getCompanyJobs(company, catalogBaseUrl, siteUrl));
            const text = !result.found
                ? `FresherFlow has no company matching "${company}". Check the spelling, or use get_jobs to search listings by text.`
                : result.hasLiveJobs
                    ? `${result.company?.name} has ${result.total} live listing${result.total === 1 ? '' : 's'} on FresherFlow. Company page: ${result.pageUrl}`
                        + (result.truncated ? ` (showing the newest ${result.returned}; call get_jobs with company="${result.company?.name}" for more.)` : '')
                    : `${result.company?.name} is on FresherFlow but has no live jobs right now. Company page: ${result.pageUrl}`;
            return {
                structuredContent: result,
                content: [{ type: 'text' as const, text }],
            };
        },
    );
}
