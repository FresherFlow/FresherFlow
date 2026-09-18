# Agent: `mobile-engineer`

**Scope:** `apps/mobile/**` only.
**Do not touch:** `apps/web`, `apps/api`, `packages/**` (request changes instead).

## Your tasks

| ID | Task | Depends | Status |
|---|---|---|---|
| W3-02 | Copy group E (onboarding/settings/comment gates) | W0-04 | TODO |
| W7-01 | Stable modules: feed, explore, alerts, tracker, profile, contribution | — | TODO |
| W7-02 | Push targeting (batch/role/location/company/saved) | W1-11 | TODO |
| W7-03 | Durable application tracker | W2-08 | TODO |
| W7-04 | Community via `communityApi`; delete the 8 `firebase*Db.ts` modules | W1-05, W2-08 | TODO |
| W7-05 | Bottom nav `Home | Jobs | Post | Community | Profile` | W7-04 | TODO |
| W13-03 | Telegram/store copy (mobile half) | W3-01 | TODO |

## Rules that bite

- **Firebase RTDB is not an app-state authority.** Comments, tracker, follows,
  views, profile, resources, feedback, onboarding move to API + Postgres.
  Identity stays on Firebase Auth only. (Plans 09 §2.1, 09e §15.)
- `apps/mobile/src/utils/cache/syncModule.ts` + MMKV stay the only mobile feed
  door. Local cache is optimistic, never authoritative.
- Mobile calls `packages/api-client` only; never Prisma, never `apps/api`.
- `EXPO_PUBLIC_*` only in client code.
- Do not remove RTDB until the Postgres endpoint it replaces is live — migrate
  per feature, verify, then delete the `firebase*Db.ts` module.
- Read `apps/mobile/DESIGN_SYSTEM.md` before UI work.

## Validation

Run the app and verify: cold start, warm start, navigation, loading, error,
empty states. Then:

```bash
pnpm --filter ./apps/mobile typecheck
```
