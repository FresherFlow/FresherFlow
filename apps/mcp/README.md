# FresherFlow MCP Server

MCP service that exposes the FresherFlow API to AI clients (ChatGPT, Claude,
Cursor, Codex): browse live jobs, submit a job, create or edit a full listing,
and — for a moderator — review, approve or reject community submissions.

Public job discovery works without sign-in. Connecting a FresherFlow account
with OAuth 2.1 adds account tools; moderator tools are resolved from RBAC on
each request. A supplied but invalid token is always rejected.

Thin wrapper over the existing FresherFlow API — no business logic, no database
access, no direct Firebase access.

## Files, and why each exists

Three layers, each with one job: the HTTP boundary, the connection's identity,
and the API surface it calls. A tool file never builds a URL or a header; it
calls one function from `src/api/`.

| File | Purpose |
|---|---|
| `src/worker.ts` | Worker entry: `/health`, OAuth discovery, origin guard, rate limit, and separate stateless public and OAuth endpoints |
| `src/identity.ts` | resolves the current OAuth caller into `moderator` / `user` plus capabilities on each request |
| `src/server.ts` | builds a per-connection `McpServer`: role-specific instructions, and only the tools that role may use |
| `src/http/token.ts` | the per-request access token (AsyncLocalStorage) and bearer parsing |
| `src/http/client.ts` | the one authenticated `fetch`, plus upstream error mapping and scrubbing |
| `src/api/identity.ts` | `whoami` |
| `src/api/jobs.ts` | public CDN feed and listing-shard reads |
| `src/api/listings.ts` | listing schema, create, update, read |
| `src/api/submissions.ts` | submit, own submissions, withdraw, review queue and decisions |
| `src/tools/*.ts` | one file per tool: its schema, description, annotations, and handler |
| `src/schemas.ts` | zod input/output for `submit_opportunity`; limits mirror the API's `mcpSubmitOpportunitySchema` |
| `src/templates/listingTemplates.ts` | API-shaped `create_listing` payloads and the content rules, served by `get_listing_template` |
| `templates/listing-templates.md` | the admin paste-JSON reference, verbatim, and how it differs from the API contract |
| `src/config.ts` | env: API base URL, public site URL, port |
| `src/logger.ts` | structured logs |
| `package.json`, `tsconfig.json`, `eslint.config.mjs` | build, types, lint |
| `README.md` | this file |

`/health` is a liveness check for the deployed Worker. It is not an MCP feature.

## Runtime configuration

Production values are declared in `wrangler.jsonc` under `vars` and must match
the API's and the web's values exactly. Keep them there rather than setting
them only in the dashboard: a deploy from this repo would otherwise leave the
Worker without bindings, and every endpoint would answer
`{"error":"MCP is not configured"}`.

- `FRESHERFLOW_API_URL`, `PUBLIC_SITE_URL`, `MCP_PUBLIC_URL`, and
  `PUBLIC_FEED_BASE_URL` are required origin URLs. `MCP_PUBLIC_URL` must match
  the API OAuth resource configuration exactly.
- `MCP_ALLOWED_ORIGINS` is a comma-separated list of exact HTTPS origins
  allowed to call `/mcp` and `/mcp/public` from browsers. Requests without an `Origin` header
  remain supported. Local HTTP deployments accept loopback origins only.
- `CDN_SIGNATURE_SECRET` is a secret binding when the feed CDN requires signed
  requests; use the same signing secret as the feed publisher.

For local development, copy `.dev.vars.example` to `.dev.vars` and set the
loopback API/feed URLs. `.dev.vars` is gitignored. `pnpm --filter
fresherflow-mcp dev` uses the single `wrangler.jsonc` configuration.

`get_listing_template` is the local one: it makes no API call, because the
payload skeleton and the filling rules are ours. It exists because the admin
form's paste-JSON dialect (`type`, `walkInDetails`, `salaryAmount`) and the
API's write contract (`category`, `driveDetails`, `salaryRange`) look alike and
are not — the closed `opportunitySchema` drops the admin keys with no error, so
a copied admin payload publishes a walk-in with no venue. The verbatim admin
reference is kept in `templates/listing-templates.md`.

## Tools

| Tool | Calls | Needs | Registered for | Annotations |
|---|---|---|---|---|
| `whoami` | `GET /api/internal/mcp/whoami` | signed-in connection | every account | `readOnlyHint: true` |
| `get_jobs` | versioned public CDN feed | public | `/mcp/public` and authenticated `/mcp` | `readOnlyHint: true` |
| `get_job` | versioned public CDN listing shard | public | `/mcp/public` and authenticated `/mcp` | `readOnlyHint: true`, `idempotentHint: true` |
| `submit_opportunity` | `POST /api/opportunities/mcp-submit` | signed-in connection | every account | `readOnlyHint: false` |
| `list_my_submissions` | `GET /api/internal/mcp/submissions` | signed in; own rows | every account | `readOnlyHint: true` |
| `withdraw_submission` | `POST /api/internal/mcp/submissions/:id/withdraw` | signed in; own `PENDING_REVIEW` rows | every account | `destructiveHint: true` |
| `get_listing_schema` | `GET /api/internal/mcp/schema` | `opportunity.review` | moderator | `readOnlyHint: true` |
| `get_listing_template` | local: `src/templates/listingTemplates.ts` | `opportunity.review` | moderator | `readOnlyHint: true` |
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

- `/mcp/public` is the anonymous endpoint and exposes only read-only public
  job search and detail. `/mcp` always requires `Authorization: Bearer <token>`;
  without one it returns `401` with the OAuth resource metadata challenge so
  standard clients can begin sign-in and discover account tools.
- A malformed or invalid supplied token is never treated as anonymous. It is
  rejected by the API during identity resolution.
- The caller's token travels with the request through `AsyncLocalStorage`
  (`apiClient.ts`), so every API call a tool makes is authenticated as that
  caller. A module-level variable would race between concurrent callers.
- Neither endpoint holds a service key. Public tools read the configured CDN
  feed; account tools call the API with the caller's token.
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

### Local development authentication

Local development uses the same OAuth 2.1 bearer flow as every other
environment. The local Wrangler config contains only loopback URLs and the
development command does not enable an unauthenticated mode. Start the local
API and web app with `API_URL=http://127.0.0.1:5001`,
`MCP_PUBLIC_URL=http://127.0.0.1:8787`, and
`PUBLIC_FRONTEND_URL=http://127.0.0.1:3000`, then connect through the local
sign-in and consent flow. The API access token is bound to the exact
`http://127.0.0.1:8787/mcp` resource and `mcp` scope; missing credentials,
unsupported scopes, and mismatched resources are rejected.

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

`get_jobs` searches the versioned public feed index. `get_job` reads a detail
shard for an exact public id or slug. Both tools are available anonymously and
return only published, unexpired opportunities. They do not expose job
discussion from **Firebase RTDB** (`/comments/{id}`).

## Run

```powershell
# Terminal 1: local API and database configuration
& '.\apps\api\scripts\dev-mcp-local.ps1'

# Terminal 2: local MCP Worker
pnpm --filter fresherflow-mcp dev
```

`pnpm --filter fresherflow-mcp dev` serves the Worker on
`http://127.0.0.1:8787`; it calls the local API on port `5001`. Copy
`.dev.vars.example` to `.dev.vars` first. Wrangler uses the single
`wrangler.jsonc`; `.dev.vars` supplies local bindings without deployment
domains or production URLs. The OAuth issuer and web consent UI must be served
by local API and web instances.

| Env var | Default | Purpose |
|---|---|---|
| `FRESHERFLOW_API_URL` | `http://127.0.0.1:5001` | Local API base URL |
| `PUBLIC_SITE_URL` | `http://127.0.0.1:3000` | Local web origin |
| `MCP_PUBLIC_URL` | `http://127.0.0.1:8787` | Local MCP resource origin; must equal the API's `MCP_PUBLIC_URL` |
| `PUBLIC_FEED_BASE_URL` | `http://127.0.0.1:5001` | Local public feed origin |
| `MCP_ALLOWED_ORIGINS` | Loopback web origins | Exact browser origins; loopback MCP development accepts loopback origins |
`PUBLIC_FEED_BASE_URL` points to the local API feed endpoint. Anonymous job
discovery uses this public feed; protected API calls use the connected
account's OAuth token. The MCP Worker has no shared service key.

Health: `GET /health`. Public MCP endpoint: `/mcp/public`. OAuth MCP endpoint:
`/mcp` (both use Streamable HTTP with JSON POST responses and no SSE stream).

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

Runs on Cloudflare Workers. `apps/mcp/wrangler.jsonc` is the whole deployment
config, and wrangler finds it by itself because the `deploy` script runs with
`apps/mcp` as its working directory.

Cloudflare Workers Builds settings:

| Field | Value |
|---|---|
| Root directory | `/` |
| Build command | `pnpm install --frozen-lockfile --filter=fresherflow-mcp` |
| Deploy command | `pnpm --filter fresherflow-mcp run deploy` |

The `run` is load-bearing: `pnpm --filter fresherflow-mcp deploy` is pnpm's own
`deploy` command, which expects a target directory and dies with
`ERR_PNPM_INVALID_DEPLOY_TARGET` before the package script is reached.

There are no secrets to set. The four vars are plain `vars` in
`wrangler.jsonc`, and the Worker deliberately holds no service key. The
`custom_domain` route publishes it at `https://mcp.fresherflow.in`, which must
match the API's `MCP_PUBLIC_URL` exactly or the two OAuth metadata documents
disagree and clients refuse the connection.

The transport is stateless — one server and transport per request, JSON
responses, no session id — which is why this needs no Durable Object. Identity
is checked on every request, so token expiry, account suspension and RBAC
changes take effect before the role-filtered tool list is built.
