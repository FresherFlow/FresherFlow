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
| `FRESHERFLOW_API_KEY` | — | Optional `x-api-key` if the API requires one |
| `PUBLIC_SITE_URL` | `https://fresherflow.in` | Used to build `jobUrl` links |
| `PORT` | `3001` | Listen port |
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
- Submission rate limit: 10/hour per IP (tighter, because the caller is untrusted).
- `jobUrl`/`sourceUrl` are **stored as data only** — the server never fetches them.
- `minSalary`/`maxSalary` (annual INR) are post-filters on published listings because
  the search API supports `q`, `city`, `type`, `page`, `limit` only.