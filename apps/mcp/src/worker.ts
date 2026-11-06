import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createFresherFlowMcpServer } from './server.js';
import { resolveConnectionIdentity } from './identity.js';
import { bearerFromHeaders, runWithAccessToken } from './http/token.js';
import { setApiBaseUrl } from './http/client.js';
import { logger } from './logger.js';

/**
 * Cloudflare Workers entry point for the FresherFlow MCP server.
 *
 * Stateless: one transport and one `McpServer` per request. Nothing has to
 * survive between requests, because the tool list is built from the caller's
 * role on each request. That is also why this needs no Durable Object.
 *
 * Every request must carry an OAuth 2.1 bearer token. There is no anonymous
 * tier and the Worker holds no service key: a request without a bearer is
 * answered with a 401 challenge pointing at the API's protected-resource
 * metadata, which is how ChatGPT/Claude start the sign-in flow.
 */

interface Env {
  FRESHERFLOW_API_URL: string;
  PUBLIC_SITE_URL: string;
  MCP_PUBLIC_URL: string;
}

const MCP_CORS_HEADERS = {
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, mcp-session-id, MCP-Protocol-Version, Mcp-Method, Mcp-Name',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Expose-Headers': 'mcp-session-id',
  'Access-Control-Max-Age': '86400',
} as const;

// Best-effort per-isolate limiter. Workers scale out, so this bounds abuse of a
// single isolate rather than acting as a global quota.
const RATE_LIMIT = { windowMs: 60_000, max: 60 };
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt <= now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT.windowMs });
    return true;
  }
  if (entry.count >= RATE_LIMIT.max) return false;
  entry.count++;
  return true;
}

function jsonResponse(body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...MCP_CORS_HEADERS, 'Content-Type': 'application/json', ...extraHeaders },
  });
}

/**
 * An origin, never a path.
 *
 * OAuth clients compare the issuer and the advertised endpoints exactly. A
 * trailing slash or a stray path here makes the discovery documents disagree
 * with the API's, and the connector re-authorizes in a loop instead of failing
 * once with a clear reason.
 */
function originOf(value: string | undefined): string {
  const raw = (value ?? '').trim();
  if (!raw) return '';
  try {
    return new URL(raw).origin;
  } catch {
    return raw.replace(/\/+$/, '');
  }
}

function getUrls(env: Env) {
  return {
    apiBaseUrl: originOf(env.FRESHERFLOW_API_URL),
    mcpPublicUrl: originOf(env.MCP_PUBLIC_URL),
    siteUrl: originOf(env.PUBLIC_SITE_URL),
  };
}

/**
 * The 401 that tells an MCP client where to send the user to sign in.
 *
 * The metadata is served by this Worker, not by the API: RFC 9728 puts the
 * protected-resource document on the resource server, and pointing at the API
 * means discovery fails whenever the API's own origin config is incomplete.
 */
function unauthorized(env: Env, message: string): Response {
  const { mcpPublicUrl } = getUrls(env);
  return jsonResponse(
    {
      jsonrpc: '2.0',
      error: { code: -32001, message },
      id: null,
    },
    401,
    {
      'WWW-Authenticate': `Bearer resource_metadata="${mcpPublicUrl}/.well-known/oauth-protected-resource/mcp", scope="mcp"`,
    },
  );
}

// Protected-resource metadata, served on the MCP host so a client that starts
// here finds it. Only the resource document is ours: an authorization-server
// document served from this origin would have to declare `issuer` as this host,
// and RFC 8414 §3.3 makes any other value a hard failure (opencode rejects the
// connection with "Issuer mismatch"). The API publishes that document at its
// own origin, and `authorization_servers` below points clients there.
function oauthProtectedResourceResponse(env: Env): Response {
  const { apiBaseUrl, mcpPublicUrl, siteUrl } = getUrls(env);
  return jsonResponse({
    resource: `${mcpPublicUrl}/mcp`,
    authorization_servers: [apiBaseUrl],
    scopes_supported: ['mcp'],
    bearer_methods_supported: ['header'],
    resource_documentation: `${siteUrl}/account?tab=connected`,
  });
}

const handler: ExportedHandler<Env> = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: MCP_CORS_HEADERS });
    }

    // Both the bare and the path-suffixed metadata URLs are valid for a resource
    // served at /mcp.
    if (url.pathname.startsWith('/.well-known/oauth-protected-resource')) {
      return oauthProtectedResourceResponse(env);
    }
    if (url.pathname === '/health') {
      return jsonResponse({ ok: true, service: 'fresherflow-mcp' });
    }
    if (url.pathname !== '/mcp') {
      return jsonResponse({ error: 'Not Found' }, 404);
    }

    const { apiBaseUrl } = getUrls(env);
    if (!apiBaseUrl) {
      logger.error('FRESHERFLOW_API_URL is not configured');
      return jsonResponse({ error: 'MCP is not configured' }, 500);
    }
    setApiBaseUrl(apiBaseUrl);

    const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
    if (!checkRateLimit(ip)) {
      return jsonResponse(
        {
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Rate limit exceeded, slow down.' },
          id: null,
        },
        429,
      );
    }

    const token = bearerFromHeaders(request.headers);
    if (!token) {
      return unauthorized(
        env,
        'Sign in to FresherFlow to use this MCP server. Connect the server again and approve access.',
      );
    }

    try {
      return await runWithAccessToken(token, async () => {
        // Resolving identity inside the token scope means every API call a tool
        // makes is authenticated as this caller, and cannot observe another
        // request's token.
        const identity = await resolveConnectionIdentity(token);
        const server = createFresherFlowMcpServer(identity);
        const transport = new WebStandardStreamableHTTPServerTransport({
          // Stateless: no session id, no resumability, no Durable Object.
          sessionIdGenerator: undefined,
          // JSON responses instead of an SSE stream: a Worker has no long-lived
          // socket to keep open, and every tool call is a single round trip.
          enableJsonResponse: true,
        });
        await server.connect(transport);
        return await transport.handleRequest(request);
      });
    } catch (error) {
      logger.error('MCP request failed', { error });
      const message = error instanceof Error ? error.message : 'Internal server error';
      const unusable = /signed-in|access token|not active|rejected/i.test(message);
      if (unusable) {
        return unauthorized(
          env,
          'This FresherFlow connection could not confirm the signed-in account. Disconnect and reconnect FresherFlow, then sign in again.',
        );
      }
      return jsonResponse(
        {
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        },
        500,
      );
    }
  },
};

export default handler;
