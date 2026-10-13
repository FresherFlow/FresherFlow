import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import { config } from './config.js';
import { logger } from './logger.js';
import { mcpRouter } from './transport.js';

// FresherFlow MCP server.
//
// Any MCP client (ChatGPT, Claude, Cursor, Codex) -> this server -> FresherFlow API -> Postgres.
// Tools live in src/tools/, registration in src/server.ts, HTTP transport in
// src/transport.ts. No business logic and no database access live here.
//
// Scope: ONE tool, submit_opportunity ->
//   POST /api/opportunities/mcp-submit
//   (apps/api/src/routes/public/opportunities/mcpSubmit.ts)
// That route is anonymous by design: it writes userId: null and stages every
// submission as PENDING_REVIEW. Nothing that appears publicly does so without
// moderator review.

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
