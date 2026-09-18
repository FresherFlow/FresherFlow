# Agent: `api-engineer`

**Scope:** `apps/api/**` only.
**Do not touch:** `apps/web`, `apps/mobile`, `packages/**` (request changes instead).

## Your tasks

| ID | Task | Depends | Status |
|---|---|---|---|
| W1-01 | `community.service.ts` — comments, votes, signals, submit, reports, notifications, activity | W0-01 | DONE |
| W1-02 | `routes/community/{jobs,notifications,users}.ts` | W1-01 | DONE |
| W1-03 | Legacy `opportunities/comments.ts` delegates to service | W1-01 | DONE |
| W1-04 | Zod schemas + `index.ts` mounts | W1-01 | DONE |
| W1-06 | `community.test.ts` matrix | W1-02 | DONE |
| W1-07 | Edge hardening: guest `myVote`, deleted subtree, vote idempotency, cache headers | W1-06 | DOING |
| W1-08 | Analytics events on community writes | W1-01 | TODO |
| W1-09 | `INCORRECT`/`CLOSED` signal auto-report | W1-01 | TODO |
| W1-10 | `commentsCount` increment | W1-01 | TODO |
| W1-11 | Notification push via worker | W1-01 | TODO |
| W1-12 | Publish → feed regeneration enqueue | W1-01 | TODO |
| W1-13 | Apply-funnel click tracking — **one home only** | — | DOING |
| W4-01 | Public stats manifest (API half) | — | TODO |
| W4-02 | Exact-path invalidation | W4-01 | TODO |
| W4-03 | `feed-version` delivery contract | W4-01 | TODO |
| W4-06 | Trending ranking payload | W1-01 | TODO |
| W5-02 | Company pages from canonical identity (API half) | W5-01 | TODO |
| W11-01 | M0 fix trust-clobber (API half) | W0-03 | TODO |
| W11-02 | M1 moderator powers | W11-01 | TODO |
| W11-04 | M3 moderation log API | W11-02 | TODO |
| W11-05 | M4 earned ladder | W11-01 | TODO |
| W11-07 | Comment auto-hide ≥3 reports | W11-02 | TODO |
| W12-01 | `POST /api/ingest/jobs` + `ingest.service` | W1-13 | TODO |
| W12-03 | Ingest test matrix | W12-01 | TODO |
| W13-01 | Cross-surface `/api/search` | W4-05 | TODO |
| W13-05 | Schema-window follow-ups (API half) | W0-03 | TODO |
| W13-06 | Moderation analytics events | W11-02 | TODO |

## Authoritative files

- Service home: `apps/api/src/infrastructure/services/community.service.ts`
- Routes: `apps/api/src/routes/community/*`, `apps/api/src/routes/public/opportunities/*`
- Middleware: `auth.ts` (`requireAuth` + reject `req.isAnonymous` for community writes), `rateLimit.ts` (`createRateLimiter` 4-field shape), `validate.ts`, `csrfGate`
- Mounts + middleware order: `apps/api/src/index.ts`

## Rules that bite

- One implementation per capability. W1-13: `clicks.ts` is canonical; the legacy
  `/api/public/opportunities/:id/click` must delegate to it or be deleted. Never a
  second tracker (commit `14f7cedc` unified event tracking already).
- Route handlers stay thin; data logic in services; multi-table writes in
  `prisma.$transaction`.
- Every public route keeps a rate limit. User-owned reads filter by `req.userId`.
- Never regenerate feeds from a public route (worker only).
- Additive schema only; no `db:push`.

## Validation

```bash
pnpm --filter ./apps/api typecheck
pnpm --filter ./apps/api test
pnpm --filter ./apps/api build
```
Plus per route: success, validation error, unauthenticated, unauthorized, 404, 429.
