# FresherFlow MCP Server

ChatGPT-facing MCP service exposing **one** tool: `submit_opportunity`.

Thin wrapper over the existing FresherFlow API — no business logic, no database
access, no direct Firebase access.

## Files, and why each exists

| File | Purpose |
|---|---|
| `src/index.ts` | process entry: `/health` (Render health check), the OpenAI challenge route, mounts the router |
| `src/transport.ts` | the MCP endpoint: rate limit, CORS, stateless streamable HTTP (`POST`/`GET`/`DELETE`) |
| `src/server.ts` | builds the `McpServer` (identity + instructions) and registers the tool |
| `src/tools/submit-opportunity.ts` | the tool's schema, description, annotations, and handler |
| `src/schemas.ts` | zod input/output; limits mirror the API's `mcpSubmitOpportunitySchema` |
| `src/apiClient.ts` | the single `POST /api/opportunities/mcp-submit` |
| `src/config.ts` | env: API base URL, site URL, port |
| `src/logger.ts` | structured logs |
| `package.json`, `tsconfig.json`, `eslint.config.mjs` | build, types, lint |
| `README.md` | this file |

`/health` exists only because `render.yaml` sets `healthCheckPath: /health`.
It is not an MCP feature.

| Tool | Calls | Annotations |
|---|---|---|
| `submit_opportunity` | `POST /api/opportunities/mcp-submit` | `readOnlyHint: false`, `destructiveHint: false` |

## Why only one tool

The submission route (`apps/api/src/routes/public/opportunities/mcpSubmit.ts`)
is **anonymous by design**: it writes `userId: null` and stages every submission
as `PENDING_REVIEW`. No tool here uses caller identity, so there is nothing for
OAuth to attach to.

Job search/detail tools were removed: the job *discussion* the web and mobile
apps render lives in **Firebase RTDB** (`/comments/{id}`), while the REST
comment/signal routes read **Postgres**. Serving those from MCP would have shown
different data than the app.

## Run

```bash
FRESHERFLOW_API_URL=http://localhost:5000 pnpm --filter fresherflow-mcp dev
```

| Env var | Default | Purpose |
|---|---|---|
| `FRESHERFLOW_API_URL` | `http://localhost:5000` | Existing FresherFlow API base URL |
| `FRESHERFLOW_API_KEY` | — | Optional bulk key: sent as `x-api-key`. Must be the API's `MCP_SUBMIT_KEY`, never `INTERNAL_API_SECRET`. |
| `PUBLIC_SITE_URL` | `https://fresherflow.in` | Public site URL |
| `PORT` / `MCP_PORT` | `5002` | Listen port |

Health: `GET /health`. MCP endpoint: `/mcp` (Streamable HTTP).

## Security

- The API's CSRF gate rejects non-safe methods without
  `X-Requested-From: fresherflow-client`; this server always sends it.
- `jobUrl` / `sourceUrl` are **stored as data only** — never fetched.
- Zod validation on input and output; limits mirror the API schema.
- Anonymous submissions are rate-limited by the API at **10/hour per IP**
  (300/hour with the bulk key).
- `PENDING_REVIEW` is reported explicitly so an agent cannot claim a job is live.

## Connect to ChatGPT

| Field | Value |
|---|---|
| Name | `FresherFlow` |
| Description | `Submit fresher jobs and internships to FresherFlow for review.` |
| Connection | `https://<deployed-host>/mcp` |
| Authentication | No authentication |

## Deploy

Declared in `render.yaml` as `fresherflow-mcp` (build and start use pnpm).
Set `FRESHERFLOW_API_URL` and `OPENAI_APPS_CHALLENGE_TOKEN` in the dashboard.
