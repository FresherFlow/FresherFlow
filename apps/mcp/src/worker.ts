import type { ExecutionContext } from '@cloudflare/workers-types';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createFresherFlowMcpServer } from './server';
import { resolveConnectionIdentity, getPublicIdentity } from './identity';
import { runWithAccessToken } from './http/token';
import { setApiBaseUrl, setInternalApiSecret } from './http/client';
import { logger } from './logger';

interface Env {
  FRESHERFLOW_API_URL: string;
  PUBLIC_SITE_URL: string;
  MCP_PUBLIC_URL: string;
  INTERNAL_API_SECRET: string;
}

const MCP_CORS_HEADERS = {
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, mcp-session-id, MCP-Protocol-Version, Mcp-Method, Mcp-Name',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Expose-Headers': 'mcp-session-id',
  'Access-Control-Max-Age': '86400',
} as const;

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

function corsHeaders(): Record<string, string> {
  return { ...MCP_CORS_HEADERS, 'Content-Type': 'application/json' };
}

function jsonResponse(body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), ...extraHeaders },
  });
}

function getUrls(env: Env) {
  const apiBaseUrl = env.FRESHERFLOW_API_URL.replace(/\/$/, '');
  const mcpPublicUrl = env.MCP_PUBLIC_URL.replace(/\/$/, '');
  const siteUrl = env.PUBLIC_SITE_URL.replace(/\/$/, '');
  return { apiBaseUrl, mcpPublicUrl, siteUrl };
}

// OAuth Discovery Endpoints (for ChatGPT/Claude MCP connector auto-discovery)
function oauthProtectedResourceResponse(env: Env): Response {
  const { apiBaseUrl, mcpPublicUrl, siteUrl } = getUrls(env);
  return jsonResponse({
    resource: mcpPublicUrl,
    authorization_servers: [apiBaseUrl],
    scopes_supported: ['mcp'],
    bearer_methods_supported: ['header'],
    resource_documentation: `${siteUrl}/account?tab=connected`,
  });
}

function oauthAuthorizationServerResponse(env: Env): Response {
  const { apiBaseUrl } = getUrls(env);
  return jsonResponse({
    issuer: apiBaseUrl,
    authorization_endpoint: `${apiBaseUrl}/oauth/authorize`,
    token_endpoint: `${apiBaseUrl}/oauth/token`,
    registration_endpoint: `${apiBaseUrl}/oauth/register`,
    revocation_endpoint: `${apiBaseUrl}/oauth/revoke`,
    scopes_supported: ['mcp'],
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['none'],
    code_challenge_methods_supported: ['S256'],
    authorization_response_iss_parameter_supported: true,
  });
}

async function handleMcpRequest(request: Request, server: McpServer): Promise<Response> {
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

  let responseBody: string | null = null;
  let responseStatus = 200;
  const responseHeaders = new Headers();

  const mockResponse = {
    setHeader: (name: string, value: string) => responseHeaders.set(name, value),
    getHeader: (name: string) => responseHeaders.get(name),
    removeHeader: (name: string) => responseHeaders.delete(name),
    writeHead: (status: number, headers?: Record<string, string>) => {
      responseStatus = status;
      if (headers) Object.entries(headers).forEach(([k, v]) => responseHeaders.set(k, v));
    },
    write: (chunk: string) => { responseBody = (responseBody ?? '') + chunk; },
    end: (chunk?: string) => { if (chunk) responseBody = (responseBody ?? '') + chunk; },
    statusCode: 200,
    headersSent: false,
  } as unknown as Response & { statusCode: number; headersSent: boolean };

  await server.connect(transport);
  await transport.handleRequest(request, mockResponse, await request.json());

  return new Response(responseBody, { status: responseStatus, headers: responseHeaders });
}

const handler = {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const __ctx = _ctx;

    const { apiBaseUrl } = getUrls(env);
    setApiBaseUrl(apiBaseUrl);
    setInternalApiSecret(env.INTERNAL_API_SECRET);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: MCP_CORS_HEADERS });
    }

    const url = new URL(request.url);

    // OAuth Discovery Endpoints (MCP connector auto-discovery)
    if (url.pathname === '/.well-known/oauth-protected-resource') {
      return oauthProtectedResourceResponse(env);
    }
    if (url.pathname === '/.well-known/oauth-authorization-server') {
      return oauthAuthorizationServerResponse(env);
    }

    if (url.pathname !== '/mcp') {
      if (url.pathname === '/health') {
        return jsonResponse({ ok: true, service: 'fresherflow-mcp' });
      }
      return jsonResponse({ error: 'Not Found' }, 404);
    }

    const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
    if (!checkRateLimit(ip)) {
      return jsonResponse({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Rate limit exceeded, slow down.' },
        id: null,
      }, 429);
    }

    const authHeader = request.headers.get('Authorization');
    const hasAuth = authHeader?.startsWith('Bearer ');

    try {
      if (hasAuth) {
        // Authenticated path: user's OAuth token
        const accessToken = authHeader!.slice(7);
        return await runWithAccessToken(accessToken, async () => {
          const identity = await resolveConnectionIdentity(accessToken);
          const server = createFresherFlowMcpServer(identity);
          return await handleMcpRequest(request, server);
        });
      } else {
        // Unauthenticated path: public tools only (service key)
        const publicIdentity = getPublicIdentity();
        const server = createFresherFlowMcpServer(publicIdentity);
        return await handleMcpRequest(request, server);
      }
    } catch (error) {
      logger.error('MCP request failed', { error });
      const message = error instanceof Error ? error.message : 'Internal server error';
      const unusable = /signed-in|access token|not active/i.test(message);
      return jsonResponse({
        jsonrpc: '2.0',
        error: {
          code: unusable ? -32001 : -32603,
          message: unusable
            ? 'This FresherFlow connection could not confirm the signed-in account. Disconnect and reconnect FresherFlow, then sign in again.'
            : 'Internal server error',
        },
        id: null,
      }, unusable ? 401 : 500);
    }
  },
} satisfies ExportedHandler<Env>;

export default handler;