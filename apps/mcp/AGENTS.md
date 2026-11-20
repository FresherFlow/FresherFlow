# FresherFlow MCP app guide

Read the repo-wide `../../AGENTS.md` first. It is the source of truth for facts
that apply to more than one app (auth model, listing writes, caching, env rules).
This file states only what is specific to `apps/mcp`.

## What this app is

A thin Cloudflare Worker over the FresherFlow API: no business logic, no
database access, no service key. Every account tool is an HTTP call made with the
caller's own OAuth bearer (`src/http/client.ts`).

| Concern | File |
|---|---|
| Worker entry, OAuth discovery, `/mcp` and `/mcp/public` | `src/worker.ts` |
| Per-connection `McpServer`, role-filtered tool list, session instructions | `src/server.ts` |
| Caller role → capabilities, resolved per request | `src/identity.ts` |
| One authenticated fetch and upstream error mapping | `src/http/client.ts` |
| Public catalog transport (no token) | `src/cdn/client.ts` |
| Public listing reads and filtering (no token) | `src/cdn/jobs.ts` |
| Company directory and per-company listings (no token) | `src/cdn/companies.ts` |
| Listing write surface | `src/api/listings.ts` |
| Submission and moderation surface | `src/api/submissions.ts` |
| One file per tool | `src/tools/*.ts` |
| `submit_opportunity` input/output schemas | `src/schemas.ts` |

## Rules that are easy to break here

- **A tool never decides whether a listing is live.** The API returns `status`
  and `published`; repeat those values verbatim. A successful write response is
  not proof: `get_listing` is the verification step.
- **The tool list is filtered by capability, not by role label.** Register from
  `identity.capabilities.*` so a staff account with missing grants is never
  offered a tool that answers 403.
- **Public tools must not require a token.** `/mcp/public` registers only
  `get_jobs`, `get_job` and `get_company_jobs`; they read the public CDN files
  and never call the authenticated API.
- **There is one creation tool: `submit_opportunity`.** `create_listing` is not
  registered on purpose — two creation paths with two contracts is what let an
  agent publish a walk-in with no venue. The full-listing tools
  (`update_listing`, `get_listing`) exist only to edit an existing listing. The submit vocabulary is
  `job | internship | walkin | government`; the full-listing vocabulary is
  `job | internship | walk-in` plus `governmentJobDetails` and
  `sector: GOVERNMENT`. `opportunitySchema` is closed, so the wrong dialect is
  dropped silently rather than rejected.
- **The minimum-completeness gate is enforced twice.** `src/schemas.ts` mirrors
  `mcpSubmitOpportunitySchema` in `apps/api/src/utils/validation.ts` for fast
  feedback; the API remains authoritative. Change both together, and keep the
  `submit_opportunity` description in step.
- **The contract lives in the tool, not in a discovery call.** There is no
  schema, template or rules tool. A write tool must be callable on its own; a
  field list split across three prerequisite tools is how the surface became
  unusable. Put every field and rule an agent needs in the tool's description.

## Verifying a change

```bash
pnpm --filter fresherflow-mcp typecheck
pnpm --filter fresherflow-mcp lint
```

There are no tests in this app. Behaviour of the write paths is covered by the
API tests (`apps/api/src/__tests__/mcp-submit.test.ts`,
`mcp-listing-write.test.ts`, `mcp-jobs.test.ts`), and the feed projection is
covered by `feed-index-projection.test.ts`. After changing a tool `inputSchema`
or `outputSchema`, reconnect a client and re-run `tools/list` — clients cache
the tool list.

Deploy is in `README.md`; `wrangler.jsonc` is the whole config and must agree
with the API's `MCP_PUBLIC_URL` exactly.
