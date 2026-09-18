# Agent: `package-engineer`

**Scope:** `packages/**` (types, api-client, constants, domain, utils, ui, queue, redis, database/schema).
**Do not touch:** `apps/**` business code.

## Your tasks

| ID | Task | Depends | Status |
|---|---|---|---|
| W0-01 | Community schema + enums | — | DONE |
| W0-02 | Community enums + interfaces in `packages/types` | — | DONE |
| W0-03 | Land community migration via deploy flow (never `db:push`) | W0-01 | BLOCKED |
| W0-04 | `packages/constants/src/copy.ts` `BRAND` export | — | TODO |
| W0-05 | `packages/ui` primitives: Textarea, Modal/Sheet, Avatar, Skeleton, EmptyState, Ellipsis | — | TODO |
| W1-05 | `api-client` `communityApi` | W0-02 | DONE |
| W11-01 | M0: `Role.MODERATOR` + constrain `determineTrustLevel` (packages half) | W0-03 | TODO |
| W13-05 | Schema-window follow-ups (schema half) | W0-03 | TODO |

## Rules that bite

- `packages/database/prisma/schema.prisma` is high-risk: additive only; any change
  affects every app. Run `pnpm db:generate`; migrations go through the deploy flow,
  not `db:push`.
- `packages/types` is the shared surface: enums must match Prisma exactly.
- Frontends consume `packages/api-client`; keep wrappers typed, no `any`.
- `packages/ui` uses existing tokens + `@repo/ui/utils/cn`; no new design system.
- One home per fact: brand strings live only in `packages/constants/src/copy.ts`.

## Shared-file hazards

Other agents append to:
`packages/types/src/index.ts` (community block), `packages/api-client/src/index.ts`
(one export line). Merge, never overwrite.

## Validation

```bash
pnpm db:generate
pnpm --filter @fresherflow/types build
pnpm --filter @fresherflow/api-client typecheck
pnpm --filter @fresherflow/constants typecheck
```
