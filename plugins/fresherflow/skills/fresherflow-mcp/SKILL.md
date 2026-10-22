---
name: fresherflow-mcp
description: Understand and use the FresherFlow MCP server. Use when connecting FresherFlow to an AI client (ChatGPT, Claude, Cursor, Codex), answering "does FresherFlow have an MCP tool for this", checking who a connection is acting as or whether a job went live, or explaining why a listing is a draft or pending review. Owns the connection, the auth flow, the tool map and the honest status contract; field-level extraction rules live in fresherflow-job-extraction.
---

# FresherFlow MCP

How an agent connects to FresherFlow over MCP, which tool to call, and what it
must never claim. Field contract and extraction rules are owned by
`../fresherflow-job-extraction/SKILL.md` — this file points to it rather than
repeating it.

## What the server is

`apps/mcp` (`fresherflow-mcp`, deployed per `render.yaml`) is a thin wrapper: no
database access, no business logic. Every tool call becomes one HTTP call to the
FresherFlow API. The tool list, identity and instructions are registered in
`apps/mcp/src/server.ts`.

| Property | Value |
|---|---|
| Transport | Streamable HTTP, stateless (fresh server per request) |
| Methods | `POST` (calls), `GET` (SSE), `DELETE` (teardown) on `/mcp` |
| Endpoint | `/mcp` — local `http://localhost:5002/mcp` (`pnpm dev:mcp`); the deployed host is recorded in the Render dashboard, not in this repo |
| Health | `GET /health` — a Render health check, not an MCP feature |
| CORS | Wildcard, no credentials (the credential travels in the `Authorization` header, never a cookie) |
| Transport limit | 60 requests/minute per IP on `/mcp`, all tools, applied by `apps/mcp/src/transport.ts` |
| Upstream limits | identity and listing writes 60/min, listing reads 120/min, moderation actions 30/min. `submit_opportunity`: 60/hour per signed-in account. |

## Every call is signed in: the OAuth flow

The MCP server is an OAuth 2.1 **resource server**; the FresherFlow API is the
**authorization server**. There is no anonymous path through `/mcp`: a request
without a valid bearer token is rejected with `401` and a
`WWW-Authenticate: Bearer resource_metadata="…"` challenge, which is how the
client discovers where to send the user to sign in.

What the user sees, in order:

1. The client opens `GET <api>/oauth/authorize` in a browser.
2. Not signed in → redirected to `<site>/login?redirect=…`, the ordinary
   FresherFlow login. There is no separate MCP account.
3. A consent card naming the AI client and the account it will act as, with
   Allow / Cancel. Approving redirects back to the client with a one-time code.
4. The client exchanges the code for tokens (authorization-code + PKCE S256;
   public clients, no client secret).

| Property | Value |
|---|---|
| Grant | `authorization_code` + `refresh_token`, PKCE **S256 only** |
| Access token | Opaque, stored SHA-256 hashed, 1 hour |
| Refresh token | Opaque, hashed, 90 days, rotated on every use |
| Revocation | `POST <api>/oauth/revoke` (RFC 7009), or the user disconnecting the app |
| Disconnect surface | `<site>/account?tab=connected` — "Connected apps", one row per client |

Because MCP tokens live in their own tables, disconnecting an app does not sign
the user out of the website. If a tool reports the access token is invalid or
expired, the fix is to disconnect and reconnect in the AI client — not a new
password or API key.

## Identity: the role decides everything

The connection holds an opaque token, so nothing about the caller is knowable
without asking. **Call `whoami` first** whenever a task depends on permission.
It returns the account, an `mcpRole` of `moderator` or `user`, the raw
`permissions` array, and a `capabilities` map.

| Role | How the account gets it | What changes |
|---|---|---|
| `moderator` | holds `opportunity.review` + `opportunity.publish` (granted from the admin panel) | `submit_opportunity` publishes; listing writes and moderation tools exist |
| `user` | every other signed-in account | `submit_opportunity` saves a `DRAFT`; no listing writes, no moderation |

| Capability | True when |
|---|---|
| `browseJobs`, `submitOpportunity`, `viewOwnSubmissions`, `withdrawOwnSubmission` | always, for any signed-in account |
| `submitPublishes` | `opportunity.publish` — the moderator rule, in one field |
| `reviewSubmissions` | `opportunity.review` |
| `approveSubmissions` | `opportunity.publish` |
| `createFullListing`, `editFullListing` | `opportunity.create` or `opportunity.edit` |

The server registers tools per role, so on a `user` connection `create_listing`,
`update_listing`, `get_listing`, `get_listing_schema` and the three moderation
tools are **not in the tool list at all**. That is expected, not a bug — never
tell the user a tool is broken when it is simply not theirs. Never promise a
moderator action on a non-moderator account; a moderator must grant the role in
the admin panel, and the change applies without the user reconnecting.

## Tool map

| Need | Tool | Needs |
|---|---|---|
| Who am I acting as, and what may I do? | `whoami` | signed-in connection |
| What is already live on the site | `get_jobs` | signed-in connection |
| Add a job | `submit_opportunity` | signed-in connection |
| A full listing from the complete admin payload | `get_listing_schema` → `create_listing` | moderator |
| Correct an existing listing | `get_listing` → `get_listing_schema` → `update_listing` | moderator |
| Prove what was actually stored | `get_listing` | moderator |
| What this account has submitted | `list_my_submissions` | signed in; own rows only |
| Take back one still awaiting review | `withdraw_submission` | signed in; **own** `PENDING_REVIEW` rows only |
| What is waiting for review | `review_queue` | moderator (`opportunity.review`) |
| Publish one reviewed submission | `approve_submission` | moderator (`opportunity.publish`) |
| Reject one submission, with a reason the submitter sees | `reject_submission` | moderator (`opportunity.review`) |

`get_jobs` accepts `q`, `city`, `company`, `type` (`internship`, `walk-in`,
`government`), `page` and `limit`; it returns live listings only, newest first,
with a canonical `fresherflow.in` URL. Use it before submitting to check for an
existing URL, and whenever the user asks what is open.

`withdraw_submission` and `reject_submission` are the only two tools marked
`destructiveHint: true`.

## The two write paths, and they are not interchangeable

| Path | Tools | What it produces |
|---|---|---|
| Community submission | `submit_opportunity` | The job itself, from the fields the posting states — published if the account is a moderator, otherwise a `DRAFT` |
| Full listing | `get_listing_schema`, `create_listing`, `update_listing`, `get_listing` | The complete admin field set — moderator only, `PUBLISHED` by default for one |

`submit_opportunity` is **not** a smaller `create_listing`, and
`create_listing` is not a safer `submit_opportunity`. Pick by what the user
asked for and by what the connection may do: a normal account can only submit;
a moderator can also build the complete listing.

The full-listing tools run as the signed-in user against the API's real RBAC —
`opportunity.create` / `opportunity.edit` / `opportunity.review`. An account
without those permissions is refused at the API and never sees the tools. (The
API also accepts a service key on `/api/internal/mcp` for pipeline scripts. That
path carries no user identity and is not reachable through an AI client, because
the transport requires a token.)

## The status contract

Say only what the response says.

| Response | Reality |
|---|---|
| `submit_opportunity` → `published: true`, `status: PUBLISHED` | Live on the site now (a moderator submitted it) |
| `submit_opportunity` → `published: false`, `status: DRAFT` | Saved as a draft; a moderator still has to publish it. **Not live** |
| `create_listing` → `published: true` | Live on the site now |
| `create_listing` → `published: false`, `message: "Listing created as a draft for moderator review."` | `DRAFT`; **not** live |

Run `submit_opportunity` first if you do not know the role: it publishes for a
moderator and drafts for everyone else, and either way it reports which
happened. There is no anonymous path through this server.

## Rules that are easy to get wrong

1. **Never claim a job is live** unless a tool response says `published: true`.
2. **A successful response is not proof.** `create_listing` returning 201 proves
   the API accepted the request, not that every field landed. Finish with
   `get_listing` and report from that response.
3. **`update_listing` is a full replace.** Anything omitted is cleared. Read
   first, then send the complete payload.
4. **The payload is a closed object.** Unknown field names are silently dropped,
   so call `get_listing_schema` instead of inventing a name. The same response
   carries the rules field names do not reveal (`governmentJobDetails`,
   `employmentTypes` as a delimited string, categories mapping to dimensions).
5. **Status vocabulary differs by tool.** The full-listing tools accept `DRAFT`,
   `PUBLISHED`, `ARCHIVED` — not `EXPIRED`. `submit_opportunity` and the
   listing tools report `DRAFT` or `PUBLISHED`.
6. **A permission refusal is not an auth failure.** When the message names a
   missing permission, say so. Do not tell the user to reconnect — reconnecting
   cannot grant a permission.
7. **Moderation is never autonomous.** Read `review_queue` first, act only when
   the moderator asked, one row at a time, and never on your own judgement.
8. **`withdraw_submission` only when asked.** It removes the unpublished
   listing. A listing that is already live cannot be withdrawn; a moderator has
   to remove it.
9. **URLs are stored as data, never fetched.** The server does not open the
   posting, so it has not verified the vacancy is real or still open, and
   neither should you say it did — see "Verification".
10. **Repeat submits are idempotent, not duplicated.** Re-submitting the same URL
    updates the pending draft and reports `updatedExisting`. A URL that is
    already published returns a conflict telling you to use `update_listing` on
    the returned id.

## Verification

The server never fetches the posting, so verification is the agent's job:

1. Read the posting yourself before submitting.
2. Store what the posting actually says — no invented salary, no widened
   eligibility. Field rules: `../fresherflow-job-extraction/SKILL.md`.
3. Read the listing back with `get_listing` and compare against your payload.
4. Report the stored status and the fields that did not land.

Do not ask for, and do not build, a server-side URL check: it would add an
outbound fetch surface that `AGENTS.md` restricts. If the posting cannot be
read, say so rather than reconstructing it.

## Errors

| Message | Cause | What to do |
|---|---|---|
| `This FresherFlow connection could not confirm the signed-in account. Disconnect and reconnect FresherFlow, then sign in again.` | The connection has no usable identity | Have the user reconnect; do not retry blind |
| `Connect FresherFlow and sign in first — submissions from the FresherFlow tools must be made by a signed-in account.` | No bearer on the submit route | Reconnect and sign in |
| `This FresherFlow account is not active, so FresherFlow tools are unavailable.` | Account suspended or deactivated | Report it; a moderator must reactivate the account |
| `Your FresherFlow account does not have the "<key>" permission, so this action is not allowed.` | Real RBAC refusal | Report which permission is missing; stop |
| `FresherFlow rejected this connection's access token. Disconnect and reconnect FresherFlow in your AI client to sign in again.` | Token revoked or expired | Reconnect |
| `Only a submission still awaiting review can be withdrawn; this one is <STATUS>.` | Already published or rejected | A moderator must remove a live listing |
| `This listing is already live on FresherFlow. Ask a moderator to remove it instead.` | Withdraw attempted on a live listing | Say a moderator is needed |
| `Merged submissions are already attached to a live listing` | Approving a merged row | Nothing to approve |
| `Submission has no linked listing to approve` / `...to reject` | Placeholder submission | Report it; nothing to decide |
| `Cannot reach the FresherFlow API. Please try again shortly.` | API unreachable from the MCP server | Report an outage, retry later |
| `The requested FresherFlow API endpoint was not found.` | Server/API version mismatch | Report it; do not retry blindly |
| `At least one sourceLink or applyLink is required` | Non-walk-in payload with no link | Add the application URL |
| `Duplicate listing detected by applyLink` | A live listing already uses that URL | `update_listing` on the returned id |
| `A listing for this URL is already published (...) Use update_listing to change it.` | Duplicate resolver refused to rewrite a live row | `get_listing`, then `update_listing` |
| `This looks like test data (TEST-MCP / DELETE ME / TestCo / TestGovt) and is rejected by the submission pipeline.` | Title or company matches the fixture guard | Use real data |
| `Editing or creating full listings needs a moderator account. ... use submit_opportunity instead` | The account is not a moderator | Submit with `submit_opportunity`; it saves a draft |

Never describe a failed write as a success. All MCP tool errors surface as tool
failures, and the API never returns a stored row it did not write.

## Reference

| Concern | Source of truth |
|---|---|
| Tool names, descriptions, annotations | `apps/mcp/src/tools/` |
| Server identity and agent instructions | `apps/mcp/src/server.ts` |
| Bearer token handling and the 401 challenge | `apps/mcp/src/transport.ts`, `apps/mcp/src/http/token.ts` |
| What each tool sends upstream | `apps/mcp/src/api/{identity,jobs,listings,submissions}.ts` |
| The authenticated fetch and error mapping | `apps/mcp/src/http/client.ts` |
| OAuth authorization server, consent screen, connections list | `apps/api/src/routes/oauth.ts` |
| Token issuance, PKCE, revocation | `apps/api/src/infrastructure/services/platform/mcpOAuth.service.ts` |
| Identity → `req.userId` for the MCP surface | `apps/api/src/middleware/mcpAccessToken.ts` |
| Role + capabilities from RBAC (`moderator` vs `user`) | `apps/api/src/application/mcp/identity.ts` |
| Role-aware tool registration and instructions | `apps/mcp/src/identity.ts`, `apps/mcp/src/server.ts` |
| Live job browse (`GET /api/internal/mcp/jobs`) | `apps/api/src/routes/internal/mcp/listings.ts` |
| Contributor and moderator routes, permissions, limits | `apps/api/src/routes/internal/mcp/contributions.ts` |
| Listing routes, schema endpoint, write permissions | `apps/api/src/routes/internal/mcp/listings.ts` |
| Submission route and its rate tiers | `apps/api/src/routes/public/opportunities/mcpSubmit.ts` |
| Write rules, duplicate policy, slug handling | `apps/api/src/application/opportunity/listingWrite.ts` |
| Permission middleware | `apps/api/src/middleware/auth.ts` |
| Field-level extraction rules | `../fresherflow-job-extraction/SKILL.md` |
