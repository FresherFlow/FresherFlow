# Agent: `web-engineer`

**Scope:** `apps/web/**` only.
**Do not touch:** `apps/api`, `apps/mobile`, `packages/**` (request changes instead).

## Your tasks

| ID | Task | Depends | Status |
|---|---|---|---|
| W2-01 | Discussion UI split per spec (Section/Tree/Composer/Node/ReportFlow/Signals/Provenance) | W1-05 | HANDOFF |
| W2-02 | `/post` page + `PostJobForm` | W1-05 | HANDOFF |
| W2-03 | Notifications center on Postgres, slug deep-links | W1-05 | HANDOFF |
| W2-04 | Contribution identity on `/u/[username]` + dashboard | W1-02 | TODO |
| W2-05 | `/discussions` feed + thread (tranche 2) | W2-01 | TODO |
| W2-06 | "Did you apply?" prompt | W1-01 | TODO |
| W2-07 | Saved/follows off RTDB | — | TODO |
| W2-08 | Tracker off RTDB (web half) | — | TODO |
| W3-01 | Copy groups A-D + F | W0-04 | TODO |
| W4-01 | Stats manifest (web consumer half) | — | TODO |
| W4-05 | Landing search + batch + pulse + hero | W3-01 | TODO |
| W4-07 | Job-card mini signal row | W4-06 | TODO |
| W4-08 | Permanent expired-job URLs | W2-01 | TODO |
| W5-02 | Company pages from canonical identity (web half) | W5-01 | TODO |
| W6-03 | Discovery ops console (web half) | W6-01 | TODO |
| W10-01 | Route groups `(shell)`/`(content)`, kill `(user)`/`(app)` | — | TODO |
| W10-02 | ContentHeader + Footer; delete `TopUtilityBar`/`SocialSidebar`/MiniFooter sniffing | W10-01 | TODO |
| W10-03 | `MobileBottomTabs` mode-driven | W10-01 | TODO |
| W10-04 | `navTree.ts` one tree; delete 5 arrays + sniffers | — | DOING |
| W10-05 | `/post` rename + redirects | — | HANDOFF |
| W10-06 | Redirect ledger in `next.config` | W10-07 | TODO |
| W10-07 | Taxonomy registry + `TopicBoardPage` + `/jobs/browse` | — | TODO |
| W10-08 | Landing execution + identity (web half) | W10-02 | TODO |
| W10-09 | `next.config.ts` tidy R1-R5 | — | TODO |
| W10-10 | One title per route | — | TODO |
| W10-11 | Thin-page guard | W10-07 | TODO |
| W11-03 | M2 `/moderation` queue UI | W11-02 | TODO |
| W11-04 | M3 `/moderation-log` UI | W11-02 | TODO |
| W13-02 | Honest iOS copy | W3-01 | TODO |
| W13-03 | Telegram/store copy (web half) | W3-01 | TODO |
| W13-04 | Blog/about/contact rewrite | W3-01 | TODO |

## Rules that bite

- ISR policy: public SEO pages must not depend on cookies/identity. Community
  data (`myVote`, `mySignals`, provenance) is fetched **client-side only** on
  `/jobs/[slug]` — never server-rendered, never in fetch cache tags.
- Never import Prisma or `apps/api`. All data through `@fresherflow/api-client`.
- Auth/notifications/dashboard read `no-store`; high-cardinality routes never
  trigger broad tag invalidation.
- Use existing design tokens; no hardcoded colors/spacing. Read
  `apps/web/DESIGN_SYSTEM.md` before UI work.
- Route/naming/URL changes are locked by docs 21 + 22 — do not invent names.
- **Do not duplicate** the API. Submit goes to `/api/jobs/submit` via api-client.

## Validation

```bash
pnpm --filter ./apps/web typecheck
pnpm --filter ./apps/web build
pnpm --filter ./apps/web test   # nav invariants
```
Every UI surface: render, loading, error, empty.
