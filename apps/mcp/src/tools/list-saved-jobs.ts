import type { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { listSavedJobs } from '../api/account.js';

const SAVED_JOB_SHAPE = z.object({
    id: z.string(),
    slug: z.string().nullable(),
    title: z.string(),
    company: z.string(),
    locations: z.array(z.string()),
    employmentTypes: z.array(z.string()),
    workMode: z.string().nullable(),
    expiresAt: z.string().nullable(),
    applyLink: z.string().nullable(),
    url: z.string().nullable(),
});

const OUTPUT_SCHEMA = z.object({
    jobs: z.array(SAVED_JOB_SHAPE),
    total: z.number().describe('Bookmarked listings in this account'),
    truncated: z.boolean().describe('true when more bookmarks exist than were returned'),
});

/**
 * Read tool: the caller's bookmarked listings.
 *
 * Bookmarks are the user's shortlist. Returning them with their real expiry date
 * is what lets an agent answer "what did I save, and what closes first?" instead
 * of re-searching and guessing.
 */
export function registerListSavedJobs(server: McpServer, siteUrl: string): void {
    server.registerTool(
        'list_saved_jobs',
        {
            title: 'List my saved FresherFlow jobs',
            description:
                'List the jobs THIS signed-in user bookmarked on FresherFlow, newest save first, with each '
                + 'listing\'s live public details, canonical link, apply link and closing date. '
                + 'Use it for "what have I saved?", "which of my saved jobs close soon?" and to find the exact id or '
                + 'slug before calling save_job with saved: false. '
                + 'Bookmarks are returned even after a listing expires — compare expiresAt with today and say which '
                + 'are closed instead of presenting them as open. An empty list means nothing has been bookmarked.',
            inputSchema: z.object({}),
            outputSchema: OUTPUT_SCHEMA,
            annotations: {
                readOnlyHint: true,
                openWorldHint: false,
                destructiveHint: false,
            },
        },
        async () => {
            const result = await listSavedJobs(siteUrl);
            const preview = result.jobs.slice(0, 10).map(
                (job) => `- ${job.title} at ${job.company}${job.expiresAt ? ` — closes ${job.expiresAt.slice(0, 10)}` : ''} — ${job.url ?? job.id}`,
            );
            return {
                structuredContent: result,
                content: [{
                    type: 'text' as const,
                    text: result.jobs.length === 0
                        ? 'No saved jobs on this FresherFlow account.'
                        : `${result.total} saved job${result.total === 1 ? '' : 's'}:\n${preview.join('\n')}`
                            + (result.truncated ? '\n(Only the newest 50 are shown.)' : ''),
                }],
            };
        },
    );
}
