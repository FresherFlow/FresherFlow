import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ApiHttpError } from './http/client.js';

/**
 * The OAuth policy every tool on this server carries in its `_meta`.
 *
 * ChatGPT decides whether a tool is callable — and whether its link UI may ever
 * appear — from `_meta.securitySchemes`, not from the transport. The
 * `WWW-Authenticate` challenge on a 401 only covers the connection: a token
 * that expires mid-session reaches the tool as a normal JSON-RPC call, and
 * without a tool-level challenge the host reports a plain tool error and never
 * offers to re-link. Both halves are required
 * (developers.openai.com/plugins/build/auth, "Triggering authentication UI").
 *
 * Declared per tool rather than server-wide, which is what the spec asks for:
 * a server-level default cannot evolve one tool at a time.
 */

/** The one scope this server issues and requires. */
export const MCP_SCOPE = 'mcp';

const OAUTH2_SCHEME = { type: 'oauth2', scopes: [MCP_SCOPE] } as const;

/** The public, read-only endpoint can serve these tools without a link. */
const NOAUTH_SCHEME = { type: 'noauth' } as const;

interface ToolRegistration {
    name: string;
    config: Record<string, unknown> & { _meta?: Record<string, unknown> };
    handler: (args: never, extra: never) => Promise<CallToolResult>;
}

function isExpiredCredential(error: unknown): boolean {
    return error instanceof ApiHttpError && error.status === 401;
}

/**
 * The `WWW-Authenticate` value that makes a host open its link UI.
 *
 * RFC 6750 form: a Bearer challenge with parameters. `resource_metadata` is the
 * document this Worker serves for the resource, so the host resolves the
 * authorization server from one URL. Both `error` and `error_description` must
 * be present or the host treats the value as an ordinary tool error.
 */
function authChallenge(resourceMetadataUrl: string): string {
    return `Bearer resource_metadata="${resourceMetadataUrl}", scope="${MCP_SCOPE}", error="invalid_token", error_description="Sign in to FresherFlow again to continue."`;
}

/**
 * Add the OAuth metadata to a server's tools and turn an in-call 401 into a
 * re-link challenge.
 *
 * Applied by wrapping `registerTool` once, so the policy is stated here and not
 * repeated in fourteen tool files, and a tool added later cannot forget it. The
 * wrapper keeps whatever `_meta` the tool already declares — `whoami`'s
 * `openai/profile` marker is merged, not replaced.
 *
 * Transport-level failures are unaffected: the Worker still answers a request
 * it cannot authenticate at all with a 401 and a challenge of its own.
 */
export function withOAuthToolMetadata(
    server: McpServer,
    options: { resourceMetadataUrl: string; anonymousAllowed: boolean },
): McpServer {
    const { resourceMetadataUrl, anonymousAllowed } = options;
    if (!resourceMetadataUrl) return server;

    const securitySchemes = anonymousAllowed
        ? [NOAUTH_SCHEME, OAUTH2_SCHEME]
        : [OAUTH2_SCHEME];

    const registerTool = server.registerTool.bind(server) as unknown as (
        name: string,
        config: ToolRegistration['config'],
        handler: ToolRegistration['handler'],
    ) => unknown;

    server.registerTool = ((
        name: string,
        config: ToolRegistration['config'],
        handler: ToolRegistration['handler'],
    ) => registerTool(
        name,
        {
            ...config,
            _meta: { ...(config._meta ?? {}), securitySchemes },
        },
        async (args: never, extra: never) => {
            try {
                return await handler(args, extra);
            } catch (error) {
                // A 403 already carries the API's own reason (missing RBAC, not
                // a missing credential) and must stay a plain tool error.
                if (!isExpiredCredential(error)) throw error;
                return {
                    isError: true,
                    content: [
                        {
                            type: 'text' as const,
                            text: 'Your FresherFlow sign-in has expired. Approve access again to continue.',
                        },
                    ],
                    _meta: { 'mcp/www_authenticate': [authChallenge(resourceMetadataUrl)] },
                };
            }
        },
    )) as unknown as McpServer['registerTool'];

    return server;
}
