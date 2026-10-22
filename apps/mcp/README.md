# FresherFlow MCP Server

MCP service that exposes the FresherFlow API to AI clients (ChatGPT, Claude,
Cursor, Codex): browse live jobs, submit a job, create or edit a full listing,
and — for a moderator — review, approve or reject community submissions.

Every connection is authenticated through the FresherFlow app with OAuth 2.1.
The caller's role is resolved from RBAC on each request, so a moderator's
submission publishes while everyone else's is saved as a draft, and the tool
list itself is filtered to what that role may use.

Thin wrapper over the existing FresherFlow API — no business logic, no database
access, no direct Firebase access.

## Files, and why each exists

Three layers, each with one job: the HTTP boundary, the connection's identity,
and the API surface it calls. A tool file never builds a URL or a header; it
calls one function from `src/api/`.

| File | Purpose |
|---|---|
| `src/index.ts` | process entry: `/health` (Render health check), JSON body parsing, mounts the MCP router |
| `src/transport.ts` | the MCP endpoint: rate limit, CORS, the OAuth 401 challenge, stateless streamable HTTP (`POST`/`GET`/`DELETE`) |
| `src/identity.ts` | resolves the OAuth caller into `moderator` / `user` plus capabilities, cached for 60s |
| `src/server.ts` | builds a per-connection `McpServer`: role-specific instructions, and only the tools that role may use |
| `src/http/token.ts` | the per-request access token (AsyncLocalStorage) and bearer parsing |
| `src/http/client.ts` | the one authenticated `fetch`, plus upstream error mapping and scrubbing |
| `src/api/identity.ts` | `whoami` |
| `src/api/jobs.ts` | live job browse (`/api/internal/mcp/jobs`) |
| `src/api/listings.ts` | listing schema, create, update, read |
| `src/api/submissions.ts` | submit, own submissions, withdraw, review queue and decisions |
| `src/tools/*.ts` | one file per tool: its schema, description, annotations, and handler |
| `src/schemas.ts` | zod input/output for `submit_opportunity`; limits mirror the API's `mcpSubmitOpportunitySchema` |
| `src/config.ts` | env: API base URL, public site URL, port |
| `src/logger.ts` | structured logs |
| `package.json`, `tsconfig.json`, `eslint.config.mjs` | build, types, lint |
| `README.md` | this file |

`/health` exists only because `render.yaml` sets `healthCheckPath: /health`.
It is not an MCP feature.

## Tools

| Tool | Calls | Needs | Registered for | Annotations |
|---|---|---|---|---|
| `whoami` | `GET /api/internal/mcp/whoami` | signed-in connection | every account | `readOnlyHint: true` |
| `get_jobs` | `GET /api/internal/mcp/jobs` | signed-in connection | every account | `readOnlyHint: true` |
| `submit_opportunity` | `POST /api/opportunities/mcp-submit` | signed-in connection | every account | `readOnlyHint: false` |
| `list_my_submissions` | `GET /api/internal/mcp/submissions` | signed in; own rows | every account | `readOnlyHint: true` |
| `withdraw_submission` | `POST /api/internal/mcp/submissions/:id/withdraw` | signed in; own `PENDING_REVIEW` rows | every account | `destructiveHint: true` |
| `get_listing_schema` | `GET /api/internal/mcp/schema` | `opportunity.review` | moderator | `readOnlyHint: true` |
| `create_listing` | `POST /api/internal/mcp/listings` | `opportunity.create` or `opportunity.edit` | moderator | `readOnlyHint: false` |
| `update_listing` | `PUT /api/internal/mcp/listings/:id` | `opportunity.edit` | moderator | `readOnlyHint: false` |
| `get_listing` | `GET /api/internal/mcp/listings/:id` | `opportunity.review` | moderator | `readOnlyHint: true` |
| `review_queue` | `GET /api/internal/mcp/review-queue` | `opportunity.review` | moderator | `readOnlyHint: true` |
| `approve_submission` | `POST /api/internal/mcp/review-queue/:id/approve` | `opportunity.publish` | moderator | `readOnlyHint: false` |
| `reject_submission` | `POST /api/internal/mcp/review-queue/:id/reject` | `opportunity.review` | moderator | `destructiveHint: true` |

Every route is under `/api/internal/mcp` except `submit_opportunity`, which uses
the submission route. The permission checks are the API's existing RBAC keys,
reached through the caller's own identity — there is no parallel permission
system for MCP, and no MCP-only role.

`moderator` means the account holds `opportunity.review` + `opportunity.publish`
in the admin panel (`/admin/moderators` grants the role). The tool list is
filtered by that role, and every route re-checks the permission, so editing the
role takes effect on the next request.

## Authentication

The MCP server is the OAuth 2.1 **resource server**; the FresherFlow API is the
**authorization server** (`apps/api/src/routes/oauth.ts`). ChatGPT and Codex
will not accept a static key or a custom header for an MCP connector, so caller
identity can only come from an authorization-code + PKCE flow.

- Every request to `/mcp` must carry `Authorization: Bearer <token>`. Without
  one the request is rejected with `401` and
  `WWW-Authenticate: Bearer resource_metadata="<api>/.well-known/oauth-protected-resource"`,
  which is how a client discovers where to send the user to sign in.
- The caller's token travels with the request through `AsyncLocalStorage`
  (`apiClient.ts`), so every API call a tool makes is authenticated as that
  caller. A module-level variable would race between concurrent callers.
- There is **no anonymous path** through this server, and the server holds no
  service key: a request without a bearer never reaches a tool.
- The account is re-checked on every call, so a suspended account's still-valid
  token is refused (`403`) rather than left usable until the token expires.
- The caller's role is resolved once per request (`src/identity.ts`) and decides
  which tools are registered. A normal account never sees `create_listing`,
  `update_listing` or the moderation tools.
- Tokens are opaque and stored hashed; access tokens last 1 hour, refresh tokens
  90 days and rotate on use. Users disconnect from
  `<site>/account?tab=connected` ("Connected apps"), which revokes every token
  for that client without signing them out of the website.

The API's `/api/internal/mcp` surface also accepts
`x-api-key: INTERNAL_API_SECRET` for first-party pipeline scripts, which have no
user identity. That path is not reachable through this server, because the
transport requires a token before any tool runs — and this process never holds
that secret, so it cannot act as an unattributable identity.

## Why the tools are shaped this way

Two write contracts, deliberately not interchangeable:

- **Community submission** — `submit_opportunity`. One row of fields parsed from
  the posting. A moderator's submission goes live immediately
  (`published: true`); every other account's submission is written as a `DRAFT`
  and waits for a moderator. The route also runs the publish side effects when a
  moderator submits, so the listing reaches the CDN feed rather than existing
  only in Postgres.
- **Full listing** — `get_listing_schema` / `create_listing` / `update_listing` /
  `get_listing`. The complete admin field set. Moderators only, because
  `opportunity.create` / `opportunity.edit` are moderator-level grants on this
  surface; `create_listing` defaults to `PUBLISHED` for them.

`get_jobs` is the read half: live listings only, through the same
`liveOpportunityWhere` rule the public feed and CDN snapshot use, so the tool
cannot report a job that a visitor cannot open. It returns listings, not the job
discussion the apps render from **Firebase RTDB** (`/comments/{id}`) — that data
is deliberately not exposed here.

## Run

```bash
FRESHERFLOW_API_URL=http://localhost:5000 pnpm --filter fresherflow-mcp dev
```

| Env var | Default | Purpose |
|---|---|---|
| `FRESHERFLOW_API_URL` | `http://localhost:5000` | Existing FresherFlow API base URL |
| `PUBLIC_SITE_URL` | `https://fresherflow.in` | Public site URL, used in tool descriptions |
| `PORT` / `MCP_PORT` | `5002` | Listen port |
No service key is configured on purpose: every call this process makes is
authenticated as the connected user, and a shared secret here would be a second,
unattributable identity any connected account could borrow.

Health: `GET /health`. MCP endpoint: `/mcp` (Streamable HTTP).

The API side needs `MCP_PUBLIC_URL` set to this server's public origin. Without
it, `/.well-known/oauth-protected-resource` answers `503` and no client can
complete the connection; `API_URL` is the issuer and must be byte-identical in
every metadata document, because OpenAI hosts compare it exactly.

## Security

- The API's CSRF gate rejects non-safe methods without
  `X-Requested-From: fresherflow-client`; this server always sends it. The
  consent form is exempted from that gate because it carries an HMAC token bound
  to the exact authorization request instead.
- `jobUrl` / `sourceUrl` are **stored as data only** — never fetched.
- Zod validation on tool input and output; limits mirror the API schemas.
- Upstream rate limits: `submit_opportunity` 60/hour **per user** (keyed by the
  resolved account, because every MCP call shares one caller IP); identity and
  listing writes 60/minute; listing reads 120/minute; moderation actions
  30/minute.
- `PENDING_REVIEW` and `DRAFT` are reported explicitly so an agent cannot claim a
  job is live.
- Upstream error text is scrubbed of filesystem paths and stack frames before it
  reaches a client.

## Connect to ChatGPT

| Field | Value |
|---|---|
| Name | `FresherFlow` |
| Description | `Add fresher jobs, internships and walk-in drives to FresherFlow.` |
| Connection | `https://<deployed-host>/mcp` |
| Authentication | OAuth 2.1 — the user signs in to FresherFlow and approves the connection |

## Deploy

Declared in `render.yaml` as `fresherflow-mcp` (build and start use pnpm). Set
`FRESHERFLOW_API_URL` and `PUBLIC_SITE_URL` in the dashboard; `render.yaml`
leaves `FRESHERFLOW_API_URL` unsynced because the host is per-environment.
