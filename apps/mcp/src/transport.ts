import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createFresherFlowMcpServer } from './server.js';
import { resolveConnectionIdentity } from './identity.js';
import { bearerFromHeaders, runWithAccessToken } from './http/token.js';
import { config } from './config.js';
import { logger } from './logger.js';

// Mirrors the CORS surface MCP clients expect: the streamable HTTP transport
// uses GET (SSE), POST, and DELETE, and carries the protocol headers below. No
// credentials are allowed, so a wildcard origin is safe here.
const MCP_CORS_HEADERS = {
  'Access-Control-Allow-Headers':
    'Content-Type, Accept, Authorization, mcp-session-id, MCP-Protocol-Version, Mcp-Method, Mcp-Name',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Expose-Headers': 'mcp-session-id',
  'Access-Control-Max-Age': '86400',
} as const;

export const mcpRouter = Router();

// Rate limiting protects the upstream FresherFlow API.
const mcpLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    jsonrpc: '2.0',
    error: { code: -32000, message: 'Rate limit exceeded, slow down.' },
    id: null,
  },
});

mcpRouter.use('/mcp', mcpLimiter);

mcpRouter.options('/mcp', (_req, res) => {
  res.set(MCP_CORS_HEADERS).sendStatus(204);
});

// Every MCP request must carry the caller's OAuth 2.1 access token. The 401
// carries the `resource_metadata` challenge the MCP spec defines, which is how
// a client discovers where to register and where to send the user to sign in.
// Without this, ChatGPT/Claude cannot complete the connection at all.
const protectedResourceMetadataUrl =
  `${config.apiBaseUrl}/.well-known/oauth-protected-resource`;

mcpRouter.use('/mcp', (req: Request, res: Response, next) => {
  if (bearerFromHeaders(req.headers as Record<string, unknown>)) {
    next();
    return;
  }
  logger.warn('Rejected unauthenticated MCP request', { path: req.path, method: req.method });
  res.set(MCP_CORS_HEADERS);
  res.set('WWW-Authenticate', `Bearer resource_metadata="${protectedResourceMetadataUrl}"`);
  res.status(401).json({
    jsonrpc: '2.0',
    error: {
      code: -32001,
      message:
        'Authorization required. Sign in to FresherFlow, then retry — no secret or API key is needed.',
    },
    id: null,
  });
});

// Per-request stateless transport: no sticky sessions needed.
const mcpHttpHandler = async (req: Request, res: Response) => {
  res.set(MCP_CORS_HEADERS);
  // The caller's token travels with the request through AsyncLocalStorage, so
  // every API call a tool makes is authenticated as that caller. The middleware
  // above guarantees it is present.
  const accessToken = bearerFromHeaders(req.headers as Record<string, unknown>);
  try {
    await runWithAccessToken(accessToken, async () => {
      // Resolve who this is before advertising tools: the role decides which
      // tools exist for this connection (a normal account never sees the listing
      // editing or moderation tools). Cached briefly — see identity.ts.
      const identity = await resolveConnectionIdentity(accessToken as string);
      // Stateless mode: a fresh server + transport per request so concurrent
      // calls never share transport state.
      const server = createFresherFlowMcpServer(identity);
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      res.on('close', () => {
        transport.close().catch(() => undefined);
        server.close().catch(() => undefined);
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    });
  } catch (error) {
    logger.error('MCP request failed', { error });
    if (!res.headersSent) {
      const message = error instanceof Error ? error.message : 'Internal server error';
      // Identity resolution is an authenticated API call. When it fails the
      // connection is not usable, and saying so is more useful than a bare 500:
      // the client can tell the user to reconnect instead of retrying forever.
      const unusable = /signed-in|access token|not active/i.test(message);
      res.status(unusable ? 401 : 500).json({
        jsonrpc: '2.0',
        error: {
          code: unusable ? -32001 : -32603,
          message: unusable
            ? 'This FresherFlow connection could not confirm the signed-in account. Disconnect and '
              + 'reconnect FresherFlow, then sign in again.'
            : 'Internal server error',
        },
        id: null,
      });
    }
  }
};

mcpRouter.post('/mcp', mcpHttpHandler);
// Streamable HTTP also uses GET (SSE stream) and DELETE (session teardown).
mcpRouter.get('/mcp', mcpHttpHandler);
mcpRouter.delete('/mcp', mcpHttpHandler);
