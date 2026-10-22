import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import { config } from './config.js';
import { logger } from './logger.js';
import { mcpRouter } from './transport.js';

// FresherFlow MCP server.
//
// Any MCP client (ChatGPT, Claude, Cursor, Codex) -> this server -> FresherFlow API -> Postgres.
// No business logic and no database access live here.
//
// Layout:
//   index.ts        process entry, /health, JSON error shape
//   transport.ts    the HTTP boundary: CORS, rate limit, OAuth 401 challenge
//   server.ts       per-connection McpServer: role-filtered tools + instructions
//   identity.ts     OAuth caller -> moderator/user, cached briefly
//   http/           token context + the one authenticated fetch + error mapping
//   api/            one module per API surface (identity, jobs, listings, submissions)
//   tools/          one file per MCP tool (schema, description, annotations, handler)
//   schemas.ts      the submit_opportunity payload contract
//
// Every request is authenticated: there is no anonymous path, and this process
// holds no service key. A moderator's submission publishes; every other
// account's is a draft a moderator must publish.

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '300kb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'fresherflow-mcp' });
});

app.use(mcpRouter);

// Malformed JSON must never surface Express's default HTML stack page:
// return a JSON-RPC parse error instead, with no internals.
app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (!err || res.headersSent) {
    next(err as Error);
    return;
  }
  logger.error('Malformed MCP request body');
  res.status(400).json({
    jsonrpc: '2.0',
    error: { code: -32700, message: 'Invalid JSON in request body' },
    id: null,
  });
});

const PORT = config.port;

app.listen(PORT, () => {
  logger.info(`FresherFlow MCP server listening on :${PORT} (endpoint: /mcp)`);
});
