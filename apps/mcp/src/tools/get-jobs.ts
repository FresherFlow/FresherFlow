import type { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { getJobs } from '../cdn/jobs.js';
import { logger } from '../logger.js';

export const JOB_SUMMARY_SHAPE = {
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
    applyLink: z.string().nullable(),
    companyLogoUrl: z.string().nullable(),
    requiredSkills: z.array(z.string()),
    allowedDegrees: z.array(z.string()),
    url: z.string().nullable(),
};

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
export function registerGetJobs(server: McpServer, catalogBaseUrl: string, siteUrl = ''): void {
    server.registerTool(
        'get_jobs',
        {
            title: 'Browse live FresherFlow jobs',
            description:
            'Search live FresherFlow jobs without signing in — fresher jobs, internships, '
                + 'walk-in drives and government vacancies. Use this before submitting to check whether '
                + 'a job is already listed, and whenever a user asks what is open, or what is '
                + 'available in a city. For one named company — “does Infosys have jobs?” — use '
                + 'get_company_jobs instead, which reads that company\'s exact listing set. '
                + 'Filters: `q` matches title or company, `city` matches a listed location by '
                + 'substring (partial city names work), `company` matches the company name by '
                + 'substring, and `type` accepts internship, walk-in or government. '
                + 'Eligibility filters: `degree` matches the listing\'s allowed level buckets '
                + '(TENTH, INTER, DIPLOMA, DEGREE, PG), `skill` matches required skills by substring, '
                + '`workMode` is ONSITE, HYBRID or REMOTE, `postedWithinDays` bounds the posting date, '
                + 'and `closesWithinDays` returns only listings whose deadline falls inside that window. '
                + 'A listing with no degree buckets is open to every level, so it still matches. '
                + 'Results are paginated (default 20, max 50) and sorted by `sort`: `newest` (default) or '
                + '`closing-soon`. Every result carries the canonical FresherFlow listing URL, the apply '
                + 'link, required skills and allowed degree buckets, so one search answers "where do I '
                + 'apply and do I qualify?". The catalog is refreshed continuously, so a just-published '
                + 'job may take a short while to appear. Only published, unexpired listings are returned, '
                + 'so an empty result means nothing live currently matches — it does not mean the site has '
                + 'no jobs.',
            inputSchema: z.object({
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
                                .describe('Company name, matched as a case-insensitive substring, e.g. "Infosys" also finds "Infosys Limited"'),
                            type: z
                                .enum(['internship', 'walk-in', 'government'])
                                .optional()
                                .describe('Restrict to internships, walk-in drives, or government vacancies'),
                            degree: z
                                .enum(['TENTH', 'INTER', 'DIPLOMA', 'DEGREE', 'PG'])
                                .optional()
                                .describe('Education level the listing must accept, e.g. DEGREE or PG'),
                            skill: z
                                .string()
                                .trim()
                                .min(1)
                                .max(60)
                                .optional()
                                .describe('Skill the listing must require, matched as a substring, e.g. "react"'),
                            workMode: z
                                .enum(['ONSITE', 'HYBRID', 'REMOTE'])
                                .optional()
                                .describe('Work mode the listing must have'),
                            postedWithinDays: z
                                .number()
                                .int()
                                .min(1)
                                .max(90)
                                .optional()
                                .describe('Only listings posted in the last N days'),
                            closesWithinDays: z
                                .number()
                                .int()
                                .min(1)
                                .max(90)
                                .optional()
                                .describe('Only listings whose deadline falls within the next N days'),
                            sort: z
                                .enum(['newest', 'closing-soon'])
                                .optional()
                                .describe('Order results: newest first (default), or earliest deadline first'),
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
                        }),
            outputSchema: z.object({
                            jobs: z.array(z.object(JOB_SUMMARY_SHAPE)),
                            total: z.number().describe('Total live listings matching the filters'),
                            page: z.number(),
                            limit: z.number(),
                            hasMore: z.boolean(),
                            nextPage: z.number().nullable(),
                        }),
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
                    ...(input.degree ? { degree: input.degree } : {}),
                    ...(input.skill ? { skill: input.skill } : {}),
                    ...(input.workMode ? { workMode: input.workMode } : {}),
                    ...(input.postedWithinDays ? { postedWithinDays: input.postedWithinDays } : {}),
                    ...(input.closesWithinDays ? { closesWithinDays: input.closesWithinDays } : {}),
                    ...(input.sort ? { sort: input.sort } : {}),
                    ...(input.page ? { page: input.page } : {}),
                    ...(input.limit ? { limit: input.limit } : {}),
                }, catalogBaseUrl, siteUrl);
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
