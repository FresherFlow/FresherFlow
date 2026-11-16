import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getJobs } from '../api/jobs.js';
import { logger } from '../logger.js';

/**
 * Read tool: browse the live FresherFlow listings.
 *
 * The write tools without this made the connection one-way — an agent could add
 * a job but could not check whether it was already on the platform, look one up
 * for a user, or answer "what fresher roles are open in Hyderabad?".
 *
 * Annotations:
 * - readOnlyHint: true
 * - openWorldHint: false (reads our own bounded service)
 */
export function registerGetJobs(server: McpServer, feedBaseUrl: string, cdnSignatureSecret?: string, siteUrl = ''): void {
    server.registerTool(
        'get_jobs',
        {
            title: 'Browse live FresherFlow jobs',
            description:
            'Search the public feed of live FresherFlow jobs without signing in — fresher jobs, internships, '
                + 'walk-in drives and government vacancies. Use this before submitting to check whether '
                + 'a job is already listed, and whenever a user asks what is open, what a company has '
                + 'posted, or what is available in a city. '
                + 'Filters: `q` matches title or company, `city` matches a listed location exactly, '
                + '`company` matches the company name exactly, and `type` accepts internship, walk-in '
                + 'or government. Results are newest first and paginated (default 20, max 50). '
                + 'Every result carries a canonical FresherFlow listing URL. Only published, unexpired '
                + 'listings are returned, so an empty result means nothing live currently matches — '
                + 'it does not mean the site has no jobs.',
            inputSchema: {
                q: z
                    .string()
                    .trim()
                    .max(100)
                    .optional()
                    .describe('Free text matched against the job title and company name'),
                city: z
                    .string()
                    .trim()
                    .max(80)
                    .optional()
                    .describe('City or location, e.g. "Hyderabad"'),
                company: z
                    .string()
                    .trim()
                    .max(100)
                    .optional()
                    .describe('Exact company name, e.g. "Infosys"'),
                type: z
                    .enum(['internship', 'walk-in', 'government'])
                    .optional()
                    .describe('Restrict to internships, walk-in drives, or government vacancies'),
                page: z
                    .number()
                    .int()
                    .min(1)
                    .max(50)
                    .optional()
                    .describe('Page number, starting at 1'),
                limit: z
                    .number()
                    .int()
                    .min(1)
                    .max(50)
                    .optional()
                    .describe('Results per page, default 20'),
                response_format: z.enum(['markdown', 'json']).optional()
                    .describe('Text rendering for the result. Structured output is returned in either format.'),
            },
            outputSchema: {
                jobs: z.array(
                    z.object({
                        id: z.string(),
                        slug: z.string().nullable(),
                        title: z.string(),
                        company: z.string(),
                        locations: z.array(z.string()),
                        employmentTypes: z.array(z.string()),
                        workMode: z.string().nullable(),
                        category: z.string(),
                        recruitmentMethod: z.string(),
                        salaryRange: z.string().nullable(),
                        salaryPeriod: z.string().nullable(),
                        experienceMin: z.number().nullable(),
                        experienceMax: z.number().nullable(),
                        postedAt: z.string().nullable(),
                        expiresAt: z.string().nullable(),
                        url: z.string().nullable(),
                    }),
                ),
                total: z.number().describe('Total live listings matching the filters'),
                page: z.number(),
                limit: z.number(),
                hasMore: z.boolean(),
                nextPage: z.number().nullable(),
            },
            annotations: {
                readOnlyHint: true,
                openWorldHint: false,
                destructiveHint: false,
            },
        },
        async (input) => {
            let result;
            try {
                result = await getJobs({
                    ...(input.q ? { q: input.q } : {}),
                    ...(input.city ? { city: input.city } : {}),
                    ...(input.company ? { company: input.company } : {}),
                    ...(input.type ? { type: input.type } : {}),
                    ...(input.page ? { page: input.page } : {}),
                    ...(input.limit ? { limit: input.limit } : {}),
                }, feedBaseUrl, cdnSignatureSecret, siteUrl);
            } catch (error) {
                logger.error('Public MCP job search failed', { error });
                return {
                    isError: true,
                    content: [{ type: 'text' as const, text: 'FresherFlow public job data is temporarily unavailable. Retry shortly.' }],
                };
            }

            const preview = result.jobs.slice(0, 5).map(
                (job) => `- ${job.title} at ${job.company}${job.locations.length ? ` (${job.locations.join(', ')})` : ''} — ${job.url ?? job.id}`,
            );

            return {
                structuredContent: result,
                content: [
                    {
                        type: 'text' as const,
                        text: input.response_format === 'json'
                            ? JSON.stringify(result)
                            : result.jobs.length === 0
                            ? 'No live FresherFlow listings match those filters.'
                            : `${result.total} live listing${result.total === 1 ? '' : 's'} match. First ${result.jobs.slice(0, 5).length}:\n${preview.join('\n')}`
                                + (result.hasMore ? `\n(More available — ask for page ${result.page + 1}.)` : ''),
                    },
                ],
            };
        },
    );
}
