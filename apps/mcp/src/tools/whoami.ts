import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { whoami } from '../api/identity.js';

/**
 * Identity tool. Read-only.
 *
 * The connection holds an opaque OAuth token, so without this the agent cannot
 * know whose account it is acting as or what that account may do. It exists so
 * the agent can answer "can you approve this?" with a fact instead of a failed
 * call, and so a permission refusal is explained before the user sees it.
 */
export function registerWhoami(server: McpServer): void {
    server.registerTool(
        'whoami',
        {
            title: 'Who is connected to FresherFlow',
            description:
                'Report the FresherFlow account this connection is signed in as, its role, and what '
                + 'it is allowed to do. `mcpRole` is "moderator" or "user": a moderator publishes on '
                + 'submit and can edit listings, while a normal account submits drafts. '
                + 'Call this before any moderation action, and whenever the user asks what you can do '
                + 'on FresherFlow, or why a tool is missing from this connection.',
            inputSchema: {},
            outputSchema: {
                signedIn: z.boolean(),
                mcpRole: z.enum(['moderator', 'user']).describe(
                    'moderator: publishes on submit and may edit listings. user: submits drafts.',
                ),
                user: z.object({
                    id: z.string(),
                    username: z.string().nullable(),
                    fullName: z.string().nullable(),
                    email: z.string().nullable(),
                    role: z.string(),
                    trustLevel: z.string().nullable(),
                    status: z.string(),
                }),
                permissions: z.array(z.string()),
                capabilities: z.record(z.string(), z.boolean()),
            },
            annotations: {
                readOnlyHint: true,
                openWorldHint: false,
                destructiveHint: false,
            },
        },
        async () => {
            const identity = await whoami();
            const can = Object.entries(identity.capabilities)
                .filter(([, allowed]) => allowed)
                .map(([name]) => name);
            return {
                structuredContent: identity,
                content: [
                    {
                        type: 'text' as const,
                        text: `${identity.user.fullName ?? identity.user.username ?? identity.user.id} `
                            + `— ${identity.mcpRole}`
                            + ` — allowed: ${can.length ? can.join(', ') : 'none'}`,
                    },
                ],
            };
        },
    );
}
