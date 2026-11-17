import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createFresherFlowMcpServer } from './server.js';
import { resolveConnectionIdentity } from './identity.js';
import { bearerFromHeaders, runWithAccessToken } from './http/token.js';
import { ApiHttpError, setApiBaseUrl } from './http/client.js';
import { logger } from './logger.js';

/**
 * Cloudflare Workers entry point for the FresherFlow MCP server.
 *
 * Stateless: one transport and one `McpServer` per request. Nothing has to
 * survive between requests, because the tool list is built from the caller's
 * role on each request. That is also why this needs no Durable Object.
 *
 * Public discovery tools are available without a bearer. A supplied bearer is
 * always validated and resolved before protected tools are registered.
 *
 */

interface Env {
  FRESHERFLOW_API_URL: string;
  PUBLIC_SITE_URL: string;
  MCP_PUBLIC_URL: string;
  PUBLIC_FEED_BASE_URL?: string;
  CDN_SIGNATURE_SECRET?: string;
}

const MCP_CORS_HEADERS = {
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, mcp-session-id, MCP-Protocol-Version, Mcp-Method, Mcp-Name',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Expose-Headers': 'mcp-session-id, WWW-Authenticate',
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * The bare origin, for a human who opened it in a browser.
 *
 * `https://mcp.fresherflow.in` is the most common thing to paste into an AI
 * client, and a bare 404 reads as "this server is broken". The transport
 * accepts that origin as an MCP endpoint too (see `isMcpPath`), so the same
 * URL works for a client; this page answers the browser with the exact URL to
 * use and where the setup guide lives.
 */
function landingPage(env: Env): Response {
  const { mcpPublicUrl, siteUrl } = getUrls(env);
  const endpoint = mcpPublicUrl ? `${mcpPublicUrl}/mcp` : '/mcp';
  const docs = siteUrl ? `${siteUrl}/docs/mcp` : 'https://fresherflow.in/docs/mcp';
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>FresherFlow MCP server</title>
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; font: 16px/1.6 ui-sans-serif, system-ui, sans-serif; background: Canvas; color: CanvasText; }
  main { width: min(34rem, calc(100% - 3rem)); padding: 2rem 0; }
  h1 { font-size: 1.25rem; margin: 0 0 .25rem; }
  p { margin: 0 0 1rem; }
  code { font: 600 .95rem/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; overflow-wrap: anywhere; }
  pre { margin: 0 0 1rem; padding: .85rem 1rem; border: 1px solid color-mix(in srgb, CanvasText 18%, transparent); border-radius: .5rem; }
  a { color: inherit; }
  .muted { opacity: .7; font-size: .9rem; }
</style>
</head>
<body>
<main>
  <h1>FresherFlow MCP server</h1>
  <p>This address is the MCP endpoint, not a website. Point your AI client at:</p>
  <pre><code>${escapeHtml(endpoint)}</code></pre>
  <p><a href="${escapeHtml(docs)}">Setup guide</a></p>
  <p class="muted">FresherFlow jobs and walk-in opportunities, read and written over MCP with your own account.</p>
</main>
</body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: { ...MCP_CORS_HEADERS, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
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
  // A client may ask for the document under the resource path
  // (`/mcp/.well-known/…`). The API serves it at its origin root only, so
  // forward the well-known path rather than the prefixed one the API does not
  // have — a 404 there leaves discovery stuck and the client never signs in.
  const apiPath = pathname.startsWith('/mcp/') ? pathname.slice('/mcp'.length) : pathname;
  return new Response(null, {
    status: 307,
    headers: { ...MCP_CORS_HEADERS, Location: `${apiBaseUrl}${apiPath}` },
  });
}

const handler: ExportedHandler<Env> = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    const isPublicMcpPath = url.pathname === '/mcp/public';
    const isRootPath = url.pathname === '/';
    // The bare origin is the same endpoint as /mcp. Clients that are given
    // `https://mcp.fresherflow.in` (no path) POST here; before this alias they
    // got a 404 and the connection looked broken, even though /mcp worked.
    const isMcpPath = url.pathname === '/mcp' || url.pathname === '/mcp/' || isPublicMcpPath || isRootPath;

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: MCP_CORS_HEADERS });
    }

    // A browser opening the bare host gets the connect instructions instead of
    // a 405. MCP clients POST here, so they never hit this branch.
    if (isRootPath && request.method === 'GET') {
      return landingPage(env);
    }

    if (isMcpPath && request.method !== 'POST') {
      // OpenAI hosts open /mcp with GET during discovery. Without a bearer
      // they need the OAuth challenge, not a bare 405 with no way forward.
      if (!isPublicMcpPath && !bearerFromHeaders(request.headers)) {
        return unauthorized(
          env,
          'Sign in to FresherFlow to access account tools. Connect the server again and approve access.',
        );
      }
      return new Response(null, {
        status: 405,
        headers: { ...MCP_CORS_HEADERS, Allow: 'POST, OPTIONS' },
      });
    }

    // Both the bare and the path-suffixed metadata URLs are valid for a resource
    // served at /mcp.
    if (url.pathname.startsWith('/.well-known/oauth-protected-resource')) {
      return oauthProtectedResourceResponse(env);
    }
    // OAuth discovery endpoints: ChatGPT may request these under /mcp/ or at the bare origin. Redirect both to the API so the issuer and metadata URL agree by construction.
    // ChatGPT may request discovery endpoints at /mcp/.well-known/* (server root)
    // or /.well-known/* (bare origin). Check both before the 405 gate.
    if (url.pathname.startsWith('/.well-known/oauth-authorization-server')
        || url.pathname.startsWith('/mcp/.well-known/oauth-authorization-server')
        || url.pathname.startsWith('/.well-known/openid-configuration')
        || url.pathname.startsWith('/mcp/.well-known/openid-configuration')) {
      return oauthAsDiscoveryRedirect(env, url.pathname);
    }
    if (url.pathname === '/health') {
      return jsonResponse({ ok: true, service: 'fresherflow-mcp' });
    }
    if (!isMcpPath) {
      return jsonResponse({ error: 'Not Found' }, 404);
    }

    const { apiBaseUrl, mcpPublicUrl, siteUrl } = getUrls(env);
    if (!apiBaseUrl || !mcpPublicUrl || !siteUrl) return configurationError();
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
    if (!token && !isPublicMcpPath) {
      return unauthorized(
        env,
        'Sign in to FresherFlow to access account tools. Connect the server again and approve access.',
      );
    }

    try {
      const run = async () => {
        // Resolving identity inside the request scope means every API call a
        // tool makes is authenticated as this caller and cannot observe another
        // request's token.
        const verifiedIdentity = token ? await resolveConnectionIdentity() : null;
        // The public endpoint remains read-only even if a client happens to
        // send a valid account token to it.
        const identity = isPublicMcpPath ? null : verifiedIdentity;
        const feedBaseUrl = originOf(env.PUBLIC_FEED_BASE_URL) || '';
        const server = createFresherFlowMcpServer(
          identity,
          siteUrl,
          feedBaseUrl,
          env.CDN_SIGNATURE_SECRET,
          // Same document `unauthorized()` advertises below, so a tool-level
          // challenge and the transport challenge point at one URL.
          `${mcpPublicUrl}/.well-known/oauth-protected-resource/mcp`,
        );
        const transport = new WebStandardStreamableHTTPServerTransport({
          // Stateless: no session id, no resumability, no Durable Object.
          sessionIdGenerator: undefined,
          // JSON responses instead of an SSE stream: a Worker has no long-lived
          // socket to keep open, and every tool call is a single round trip.
          enableJsonResponse: true,
        });
        await server.connect(transport);
        return await transport.handleRequest(request);
      };
      // A supplied but invalid credential must never silently downgrade to anonymous.
      return token ? await runWithAccessToken(token, run) : await run();
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

