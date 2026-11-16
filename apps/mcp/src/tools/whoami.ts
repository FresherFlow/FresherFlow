import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { whoami } from '../api/identity.js';

/**
 * Identity tool. Read-only.
 *
 * The connection holds an opaque OAuth token, so without this the agent cannot
 * know whose account it is acting as. It is also this server's OpenAI profile
 * tool: ChatGPT calls it to recognise a connected profile across reconnections
 * and to label multi-account connections, so it returns the profile contract
 * from developers.openai.com/plugins/build/auth verbatim — `_meta["openai/profile"]`
 * plus `{ id, name?, email?, nickname? }`. Nothing else may appear in
 * `structuredContent`: that schema is validated by the host and an extra field
 * fails the whole connection. The role and permissions the agent needs are in
 * this connection's `instructions`, which are rebuilt per request from the same
 * identity.
 */
export function registerWhoami(server: McpServer): void {
    server.registerTool(
        'whoami',
        {
            title: 'Who is connected to FresherFlow',
            description:
                'Return the FresherFlow profile this connection is signed in as. The opaque `id` is '
                + 'stable across token refresh and reconnection, so the same account is recognised '
                + 'again. Call this when you need to know which account you are acting for, or to '
                + 'distinguish two connected accounts.',
            inputSchema: {},
            outputSchema: {
                id: z.string().min(1).describe(
                    'Opaque FresherFlow profile identifier, unchanged across token refresh and reconnection.',
                ),
                name: z.string().optional().describe('Display name for the connected profile.'),
                email: z.string().optional().describe('Email for display; never used as the profile identity.'),
                nickname: z.string().optional().describe(
                    'Human label that distinguishes this connection, including its FresherFlow role.',
                ),
            },
            _meta: {
                // The marker OpenAI uses to find the profile tool. It is the
                // whole key, not a nested flag: `{ profile: true }` is ignored.
                'openai/profile': true,
            },
            annotations: {
                readOnlyHint: true,
                openWorldHint: false,
                destructiveHint: false,
            },
        },
        async () => {
            const identity = await whoami();
            const { user } = identity;
            const handle = user.username ? `@${user.username}` : user.fullName ?? user.id;
            const profile = {
                id: user.id,
                ...(user.fullName ? { name: user.fullName } : {}),
                ...(user.email ? { email: user.email } : {}),
                nickname: `${handle} — ${identity.mcpRole}`,
            };
            return {
                structuredContent: profile,
                // The same profile as JSON, for hosts that only read text.
                content: [{ type: 'text' as const, text: JSON.stringify(profile) }],
            };
        },
    );
}
