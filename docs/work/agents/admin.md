# Agent: `admin-engineer`

**Scope:** `apps/admin-mobile/**` (and admin-only web surfaces under
`apps/web/src/app/(admin)` are handled by `web` unless assigned).

## Status: FROZEN during the rebuild

Per product contract `11` §5: live buildable surfaces are **web, api, mobile**.
`apps/admin-mobile` is **frozen** — do not improve, promote, or extend it while
the P0/P1 community rebuild runs.

Moderation tooling in the rebuild window lives at web `/moderation` (task W11-03)
and API `/api/moderation/*` (W11-02), **not** in admin-mobile.

## When unfrozen

Take W8 (recruiter/organization) and W11 (moderation) surfaces only after the
dependency spine in `TASKS.md` shows them unblocked.

## Validation (when unfrozen)

```bash
pnpm --filter ./apps/admin-mobile typecheck
```
