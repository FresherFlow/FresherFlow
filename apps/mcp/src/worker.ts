import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createFresherFlowMcpServer } from './server.js';
import { resolveConnectionIdentity } from './identity.js';
import { bearerFromHeaders, runWithAccessToken, runWithLocalDevScope } from './http/token.js';
import { ApiHttpError, setApiBaseUrl } from './http/client.js';
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
 *
 * The single exception is the dev-only `MCP_AUTH_MODE=local_noauth`, which
 * skips the challenge so a local client can reach `http://localhost:8787/mcp`
 * without an OAuth round trip. Anything other than that exact value — including
 * an unset variable on production — is the OAuth path above, unchanged.
 */

interface Env {
  FRESHERFLOW_API_URL: string;
  PUBLIC_SITE_URL: string;
  MCP_PUBLIC_URL: string;
  /** Only ever `local_noauth` (set by the dev script); absent in production. */
  MCP_AUTH_MODE?: string;
}

/** The one value that disables OAuth. Anything else is the normal auth path. */
const LOCAL_NOAUTH = 'local_noauth';

const MCP_CORS_HEADERS = {
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, mcp-session-id, MCP-Protocol-Version, Mcp-Method, Mcp-Name',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Expose-Headers': 'mcp-session-id',
  'Access-Control-Max-Age': '86400',
} as const;

// Best-effort per-isolate guard. Authoritative quotas live in the API, where
// they can be enforced across Worker isolates and key writes by user identity.
const RATE_LIMIT = { windowMs: 60_000, max: 600 };
const RATE_LIMIT_MAX_KEYS = 2_000;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
let nextRateLimitCleanupAt = 0;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  if (now >= nextRateLimitCleanupAt) {
    for (const [key, entry] of rateLimitMap) {
      if (entry.resetAt <= now) rateLimitMap.delete(key);
    }
    nextRateLimitCleanupAt = now + RATE_LIMIT.windowMs;
  }

  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt <= now) {
    // Bound memory use if a high-cardinality source rotates addresses. This is
    // only a local guard; API rate limits remain the protection at scale.
    while (rateLimitMap.size >= RATE_LIMIT_MAX_KEYS) {
      const oldest = rateLimitMap.keys().next().value;
      if (oldest === undefined) break;
      rateLimitMap.delete(oldest);
    }
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
    const parsed = new URL(raw);
    const localHttp = parsed.protocol === 'http:'
      && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '[::1]');
    if ((parsed.protocol !== 'https:' && !localHttp)
      || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
      return '';
    }
    return parsed.origin;
  } catch {
    return '';
  }
}

function getUrls(env: Env) {
  return {
    apiBaseUrl: originOf(env.FRESHERFLOW_API_URL),
    mcpPublicUrl: originOf(env.MCP_PUBLIC_URL),
    siteUrl: originOf(env.PUBLIC_SITE_URL),
  };
}

function configurationError(): Response {
  logger.error('MCP public origins are missing or invalid');
  return jsonResponse({ error: 'MCP is not configured' }, 500);
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
  if (!mcpPublicUrl) return configurationError();
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
// own origin, `authorization_servers` below points clients there, and a client
// that asks this origin for it anyway is redirected there
// (`oauthAsDiscoveryRedirect`).
function oauthProtectedResourceResponse(env: Env): Response {
  const { apiBaseUrl, mcpPublicUrl, siteUrl } = getUrls(env);
  if (!apiBaseUrl || !mcpPublicUrl || !siteUrl) return configurationError();
  return jsonResponse({
    resource: `${mcpPublicUrl}/mcp`,
    authorization_servers: [apiBaseUrl],
    scopes_supported: ['mcp'],
    bearer_methods_supported: ['header'],
    resource_documentation: `${siteUrl}/account?tab=connected`,
  });
}

/**
 * Same-origin authorization-server discovery: 307 to the API's own URL.
 *
 * A client that looks for `/.well-known/oauth-authorization-server` or
 * `/.well-known/openid-configuration` on this origin must not get a 404 —
 * a client stuck on discovery retries the401 forever instead of ever
 * signing in. The document is never copied here: the API owns it and the
 * `issuer` inside it, and a copy served from this origin would have to
 * declare this host as issuer, which RFC 8414 §3.3 rejects. After the
 * redirect the effective URL is the API's well-known URL — exactly where
 * the API serves the document — so issuer and metadata URL agree by
 * construction, and there is no second copy to drift.
 *
 * Runs before the config check, like the resource document. Without an API
 * URL there is nothing to redirect to, so the misconfiguration is reported
 * as 500 — the endpoint exists, the deployment is broken — never 404.
 */
function oauthAsDiscoveryRedirect(env: Env, pathname: string): Response {
  const { apiBaseUrl } = getUrls(env);
  if (!apiBaseUrl) {
    logger.error('FRESHERFLOW_API_URL is not configured');
    return jsonResponse({ error: 'MCP is not configured' }, 500);
  }
  return new Response(null, {
    status: 307,
    headers: { ...MCP_CORS_HEADERS, Location: `${apiBaseUrl}${pathname}` },
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
    if (url.pathname === '/.well-known/oauth-authorization-server'
      || url.pathname === '/.well-known/openid-configuration') {
      return oauthAsDiscoveryRedirect(env, url.pathname);
    }
    if (url.pathname === '/health') {
      return jsonResponse({ ok: true, service: 'fresherflow-mcp' });
    }
    if (url.pathname !== '/mcp') {
      return jsonResponse({ error: 'Not Found' }, 404);
    }

    const { apiBaseUrl } = getUrls(env);
    if (!apiBaseUrl) return configurationError();
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
    // Dev-only escape hatch: with `MCP_AUTH_MODE=local_noauth` a request with
    // no bearer proceeds in a local-dev scope instead of being challenged, so
    // a local client needs no OAuth round trip. A request that did bring a
    // bearer still runs in the token scope, exactly as in any other mode —
    // the flag only changes what happens when there is no token.
    const localDev = !token && env.MCP_AUTH_MODE === LOCAL_NOAUTH;
    if (!token && !localDev) {
      return unauthorized(
        env,
        'Sign in to FresherFlow to use this MCP server. Connect the server again and approve access.',
      );
    }

    try {
      const runScoped = (fn: () => Promise<Response>): Promise<Response> =>
        (token ? runWithAccessToken(token, fn) : runWithLocalDevScope(fn));
      return await runScoped(async () => {
        // Resolving identity inside the request scope means every API call a
        // tool makes is authenticated as this caller (or, in local-dev mode,
        // marked as such via one header), and cannot observe another
        // request's token.
        const identity = await resolveConnectionIdentity();
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
      if (error instanceof ApiHttpError && error.status === 401) {
        return unauthorized(
          env,
          'This FresherFlow connection could not confirm the signed-in account. Disconnect and reconnect FresherFlow, then sign in again.',
        );
      }
      if (error instanceof ApiHttpError && error.status === 403) {
        return jsonResponse(
          { jsonrpc: '2.0', error: { code: -32003, message: error.message }, id: null },
          403,
        );
      }
      if (error instanceof ApiHttpError && error.status === 429) {
        return jsonResponse(
          { jsonrpc: '2.0', error: { code: -32000, message: 'FresherFlow is rate limiting this request. Please retry shortly.' }, id: null },
          429,
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
