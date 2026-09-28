# Community submissions queue audit — 2026-09-28

Page: `apps/web/.../admin/community-submissions` → `features/moderation/components/CommunitySubmissionsQueue.tsx`.
Reference patterns: shadcn-admin data-table kit; open-seo contributes review-workflow
principles only (different stack — Hono/Drizzle — no portable code): triage by
severity, estimate before bulk runs, human approves every publish.

## Shipped this round (agent, typechecked)

1. **Source badge** — `MCP` / `Guest` pill per row from `extractedData.submittedVia`
   (was stored but never rendered). `community_web` shows no badge (default).
2. **Search filter** — client-side title/company/URL search composing with the
   status tabs.
3. **Preview before approve** — read-only modal with the full draft (all fields
   incl. walk-in dates/venue, eligibility, salary) via the existing admin
   opportunity-detail GET keyed off the row's `opportunityId`; graceful fallback
   to row fields when unavailable. No actions inside (rows stay the only path).

## Open / discussed (not built)

4. **Bulk approve/reject** — needs a floating bar + sequential per-id calls +
   summary toast (same shape as users bulk). API has no bulk submissions
   endpoint; sequential is correct (one audit row each).
5. **API `take: 200`, no pagination** (`admin/opportunities/communitySubmissions.ts:48`).
   Fine until the queue grows; then add page/limit like the listings grid.
6. **Severity triage** (open-seo lesson) — order pending rows by risk signals
   (trust score, reporter count) instead of newest-first. Needs product call on
   the ordering.
7. **Estimate-before-run** (open-seo lesson) — bulk bar should state what will
   go live ("3 will publish") before confirm. Fold into item 4.

## Verified facts (MCP channel test, local dev)

- MCP submissions are **anonymous guest submissions**: `userId null` →
  `PENDING_REVIEW`, `submittedVia: 'mcp'`, attributed to the auto-created
  "FresherFlow Community" identity (never a real admin account).
- MCP replies cover all cases, verified live: `201` staged-for-review message,
  `200` "already exists" on duplicate URL, `422` field errors, 10/hour/IP limit.
- MCP schema now expresses job/internship/walk-in (dates/venue) /government
  (sector); previously everything landed generic EMPLOYMENT.
- Attribution fix history: anonymous rows briefly pinned to the admin account
  (missing community-bot fallback) — fixed; stale tabs may still show it until
  hard refresh.
