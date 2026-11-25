import type { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { setJobSaved } from '../api/account.js';

const OUTPUT_SCHEMA = z.object({
    job: z.string().describe('The listing id or slug the bookmark was set on'),
    saved: z.boolean().describe('The bookmark state now stored for this account'),
    corrected: z.boolean().describe('true when FresherFlow flipped the bookmark twice to reach the requested state'),
});

/**
 * Write tool: bookmark or unbookmark one listing for the caller.
 *
 * One tool, because a save and an un-save are the same user object with the same
 * permission and the same failure mode. Splitting them would create two names
 * for one action. It never touches another account: the API keys the row by the
 * caller's token.
 */
export function registerSaveJob(server: McpServer): void {
    server.registerTool(
        'save_job',
        {
            title: 'Save or remove a FresherFlow job',
            description:
                'Save or remove a bookmark for this signed-in FresherFlow account. '
                + 'Set saved: true to save, saved: false to remove. Accepts the listing id or slug from get_jobs, '
                + 'get_job, get_company_jobs or list_saved_jobs. '
                + 'The response reports the state actually stored: saved is that state, and corrected: true means '
                + 'the listing was already in the requested state so FresherFlow corrected the toggle.',
            inputSchema: z.object({
                identifier: z
                    .string()
                    .trim()
                    .min(1)
                    .max(128)
                    .describe('Exact FresherFlow listing id or slug, copied from a search or list_saved_jobs result'),
                saved: z
                    .boolean()
                    .describe('true to bookmark the job, false to remove the bookmark'),
            }),
            outputSchema: OUTPUT_SCHEMA,
            annotations: {
                readOnlyHint: false,
                // Claude only asks before a write when destructiveHint is true;
                // a bookmark change still modifies account state.
                destructiveHint: true,
                idempotentHint: true,
                openWorldHint: false,
            },
        },
        async ({ identifier, saved }) => {
            const outcome = await setJobSaved(identifier, saved);
            const result = { job: identifier, ...outcome };
            return {
                structuredContent: result,
                content: [{
                    type: 'text' as const,
                    text: outcome.saved
                        ? 'Saved to this account\'s FresherFlow bookmarks.'
                        : 'Removed from this account\'s FresherFlow bookmarks.',
                }],
            };
        },
    );
}
