# FresherFlow MCP Server

Read/write MCP service exposing FresherFlow job data to AI assistants (ChatGPT).
Implements `mcp.md`: thin tools over the existing FresherFlow API, no duplicated business logic, no direct database access.

| Tool | Calls | Purpose | Annotations |
|---|---|---|---|
| `search_jobs` | `GET /api/opportunities/search` | Search published jobs/internships/walk-ins | readOnly |
| `get_job` | `GET /api/opportunities/:id` | Full public details of one job | readOnly |
| `get_job_signals` | `GET /api/jobs/:id/signals` | Community engagement signals | readOnly |
| `get_job_comments` | `GET /api/jobs/:id/comments` | Community comments and discussions | readOnly |
| `submit_opportunity` | `POST /api/opportunities/mcp-submit` | Anonymous opportunity submission for moderation | **write** |

## Run

```bash
FRESHERFLOW_API_URL=http://localhost:5000 pnpm --filter fresherflow-mcp dev
```

| Env var | Default | Purpose |
|---|---|---|
| `FRESHERFLOW_API_URL` | `http://localhost:5000` | Existing FresherFlow API base URL |
| `FRESHERFLOW_API_KEY` | — | Pipe-level bulk key: sent as `x-api-key` when the call carries no per-call key. Same tier as below. Never set this to `INTERNAL_API_SECRET`. |
| `PUBLIC_SITE_URL` | `https://fresherflow.in` | Used to build `jobUrl` links |
| `PORT` | `5002` | Listen port (`MCP_PORT` takes precedence when both are set) |
| `OPENAI_APPS_CHALLENGE_TOKEN` | — | Domain-verification token; served verbatim at `/.well-known/openai-apps-challenge`, 404 when unset |

Health: `GET /health`. MCP endpoint: `/mcp` (Streamable HTTP: `POST`, `GET`, `DELETE`).

## Connect to ChatGPT

1. Deploy as a public HTTPS service (see `render.yaml`: `fresherflow-mcp`).
2. Register the MCP endpoint in the ChatGPT app/integration workflow:
   - Name: FresherFlow
   - Description: Find verified jobs and internships for Indian freshers.
   - MCP endpoint: `https://mcp.fresherflow.in/mcp`
   - Tools: `search_jobs`, `get_job`, `submit_opportunity`
3. Verify tool discovery, then test real queries (§8 of `mcp.md`).

## Security

- **Read-only tools** make only `GET` calls against public API routes. No SQL, no writes.
- **`submit_opportunity` is a write tool** (`readOnlyHint: false`). It is anonymous, but
  anonymous submission ≠ anonymous publishing:
  - Submissions land in `PENDING_REVIEW` and are never visible until a moderator approves them.
  - The tool response explicitly states the submission is *not* published, so an AI agent
    cannot falsely tell a user their job is live.
- Zod validation on all tool inputs and outputs; results capped at 20 jobs per call.
- Global rate limit: 60 requests/minute per IP; 10s upstream timeout.
- Submission rate limits (per IP, per hour): **10 anonymous**, **300 with the bulk key**
  (`MCP_SUBMIT_KEY` on the API, same value in `FRESHERFLOW_API_KEY` here). Anonymous
  submissions stay throttled against spam; bulk link-dumps use the key.
- **Whose key is whose:** the API cannot tell agents apart — all MCP traffic arrives
  from one IP. So there are two key paths: the *per-call* `submitKey` tool field
  (the operator pastes it into chat; strangers don't have it, so they stay on
  10/hour) and the *pipe-level* `FRESHERFLOW_API_KEY` env fallback (upgrades the
  whole pipe, strangers included — fine while you are the only bulk user, but the
  per-call key is the precise one). A leaked key buys nothing but faster PENDING
  rows; it can never publish.
- `submit_opportunity` responses are always explicit: `201 PENDING_REVIEW` (new),
  `200 PUBLISHED` (URL already live), `200 PENDING_REVIEW` (URL already staged, not
  live), `400` with `field: reason` messages on validation errors, `429` when the
  hourly tier is exhausted. The text reply mirrors the server verdict verbatim.
- `jobUrl`/`sourceUrl` are **stored as data only** — the server never fetches them.
- `minSalary`/`maxSalary` (annual INR) are post-filters on published listings because
  the search API supports `q`, `city`, `type`, `page`, `limit` only.