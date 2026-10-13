import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createFresherFlowMcpServer } from './server.js';
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

// Per-request stateless transport: no sticky sessions needed.
const mcpHttpHandler = async (req: Request, res: Response) => {
  res.set(MCP_CORS_HEADERS);
  try {
    // Stateless mode: a fresh server + transport per request so concurrent
    // calls never share transport state.
    const server = createFresherFlowMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    res.on('close', () => {
      transport.close().catch(() => undefined);
      server.close().catch(() => undefined);
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    logger.error('MCP request failed', { error });
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null,
      });
    }
  }
};

mcpRouter.post('/mcp', mcpHttpHandler);
// Streamable HTTP also uses GET (SSE stream) and DELETE (session teardown).
mcpRouter.get('/mcp', mcpHttpHandler);
mcpRouter.delete('/mcp', mcpHttpHandler);
