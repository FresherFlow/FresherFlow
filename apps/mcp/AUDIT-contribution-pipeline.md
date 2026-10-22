# MCP contribution pipeline — external audit (superseded)

**Status: superseded.** Retained so the same audit is not re-run against code it no longer describes.

An external review of FresherFlow's MCP submission path was commissioned. Every "needs fixing" finding was
re-checked against the current tree before filing. All four high/medium items had already been addressed by
the OAuth-based contributor work; only one observation still holds, and it is a deliberate design choice.

## What the audit claimed, and what verification found

| Audit finding | Verified status | Evidence |
|---|---|---|
| "Eligibility field isn't persisted by the MCP endpoint — the route doesn't pass it into the submission service" | **Wrong.** Already fixed | `apps/api/src/routes/public/opportunities/mcpSubmit.ts:116` passes `eligibility: body.eligibility ?? null` |
| "Route supplies empty `requiredSkills` and `allowedPassoutYears` rather than populating them" | **Wrong.** Already fixed | `mcpSubmit.ts:114-115` pass `body.skills ?? []` / `body.passoutYears ?? []`; both are in `mcpSubmitOpportunitySchema` (`apps/api/src/utils/validation.ts:590-593`) |
| "Contributors cannot publish directly — submissions enter PENDING_REVIEW, a moderator must approve" | **Wrong.** A signed-in contributor publishes | `mcpSubmit.ts:122` — `published: Boolean(signedInUserId)`. Anonymous callers still stage for review, deliberately |
| "No MCP correction or withdrawal tools" | **Wrong.** Now present | `apps/mcp/src/tools/withdraw-submission.ts`, `list-my-submissions.ts`, plus moderator-side `review-queue.ts`, `approve-submission.ts`, `reject-submission.ts` |

## Still accurate

**"Job verification happens outside the MCP — the server stores URLs without fetching them, so the client must
confirm the vacancy is genuine and open."**

This remains true and is intentional. The MCP server treats `jobUrl` as data, never fetching it. That keeps
the server free of SSRF exposure and keeps a scraped URL from becoming a published listing by itself. The
responsibility is pushed to the layer that can do it properly: the extraction skill verifies the posting,
and an authenticated contributor is accountable for what they submit.

The residual risk is anonymous submission of a fabricated URL, which lands in `PENDING_REVIEW`. That is the
trade the moderation queue exists to absorb.

## The gap the audit actually pointed at, restated accurately

The real issue behind "the MCP can submit but not manage" was that the *transport* never carried identity.
The API supported an OAuth 2.1 bearer on `POST /api/opportunities/mcp-submit`, but the MCP server sent only
`x-api-key`, so `signedInUserId` was always `null` and every submission silently degraded to anonymous
staging — the contributor's authenticated path was unreachable.

Fixed by forwarding the caller's token end to end:

- `apps/mcp/src/transport.ts:74` requires a bearer on every MCP request
- `apps/mcp/src/apiClient.ts:92` forwards it as `Authorization: Bearer`
- `apps/mcp/src/infrastructure/.../mcpOAuth.service.ts` + `middleware/mcpAccessToken.ts` + `routes/oauth.ts`
  issue and verify it

`whoami` (`apps/mcp/src/tools/whoami.ts`) exists so an agent can confirm which identity it is acting as
before it submits something that publishes.

## Auth model, for reference

| Path | Identity | Outcome |
|---|---|---|
| `submit_opportunity`, anonymous | none | `PENDING_REVIEW`, moderator queue |
| `submit_opportunity`, OAuth bearer | `mcp_user` | published |
| `create_listing` / `update_listing` | `INTERNAL_API_SECRET` | draft by default, published only on explicit request |
| `withdraw_submission` | bearer, own row | withdraws own submission |
| `review_queue` / `approve` / `reject` | bearer with moderator scope | moderation |

No listing write is reachable without a credential, and no anonymous caller can publish through any path.