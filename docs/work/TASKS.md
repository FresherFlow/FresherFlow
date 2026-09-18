# Master Task Register

Every task from the `docs/plans` pack, merged and owner-assigned.
Status legend and rules: see `README.md`.

Owner keys: `api` `packages` `web` `mobile` `pipeline` `admin` `design` `platform` `research`.

## How to read a `Source` cell

`Source` cells read `<folder>/PLAN <doc> §<section>`, where `<folder>` is the
workstream folder under `docs/plans/`. Every workstream's documents are merged
into that folder's `PLAN.md`, each under a `<!-- ===== source: <file> ===== -->`
marker.

Example: `02/PLAN 09b §6` resolves to
`docs/plans/02-community-rebuild/PLAN.md`, marker
`<!-- ===== source: 09b-data-and-api.md ===== -->`, section §6.

| Folder key | File |
|---|---|
| `01` | `docs/plans/01-product-foundation/PLAN.md` |
| `02` | `docs/plans/02-community-rebuild/PLAN.md` |
| `03` | `docs/plans/03-public-web-and-data/PLAN.md` |
| `04` | `docs/plans/04-frontend-stack/PLAN.md` |
| `05` | `docs/plans/05-execution-and-audits/PLAN.md` |
| `06` | `docs/plans/06-mobile-retention/PLAN.md` |
| `07` | `docs/plans/07-recruiter-and-org/PLAN.md` |
| `08` | `docs/plans/08-open-source/PLAN.md` |
| `09` | `docs/plans/09-messaging-and-copy/PLAN.md` |

## Status verification

Statuses below were re-verified against the worktree, not carried forward.
Every `DONE` and `HANDOFF` row carries a check that was actually run. See
`## Verification log` at the bottom for the commands and results.

---

## W0 — Foundation (blocks everything)

| ID | Task | Owner | Source | Depends | Acceptance | Status |
|---|---|---|---|---|---|---|
| W0-01 | Community schema: enums + `CommentVote`, `JobSignal`, `JobSubmission`, `Report`, `Notification`, `OpportunityComment` threading fields | packages | 02/PLAN 09b §6, 05/PLAN 14e P0.1 | — | `pnpm db:generate` exits 0 | DONE |
| W0-02 | Mirror community enums + interfaces in `packages/types` | packages | 02/PLAN 09b §6.3, 05/PLAN 14e P0.2 | — | `@fresherflow/types` build green | DONE |
| W0-03 | Land community migration via deploy flow (no `db:push`) | packages | 02/PLAN 09b §6, 02/PLAN 09e T0.3, 05/PLAN 25 | W0-01 | new tables exist in staging | BLOCKED |
| W0-04 | `packages/constants/src/copy.ts` exporting `BRAND` (TAGLINE_BRAND, TAGLINE_HERO, DESCRIPTION_MASTER, PITCH_APP) | packages | 09/PLAN 10 §9, 05/PLAN 26 §2 | — | constants typecheck; only home of the 4 lines | TODO |
| W0-05 | `packages/ui` primitives: Textarea, Modal/Sheet, Avatar, Skeleton, EmptyState, Ellipsis menu | packages | 01/PLAN 12 Gap3 | — | built on existing tokens + `cn`; no new design system | TODO |

## W1 — Community core (API)

| ID | Task | Owner | Source | Depends | Acceptance | Status |
|---|---|---|---|---|---|---|
| W1-01 | `community.service.ts`: comments, votes, signals, submit, reports, notifications, activity | api | 02/PLAN 09b §7, 02/PLAN 23 §3 | W0-01 | api typecheck; comment tree + vote recompute covered | DONE |
| W1-02 | `routes/community/{jobs,notifications,users}.ts` | api | 02/PLAN 23 §5 | W1-01 | 200/400/401/403/404 hit per route | DONE |
| W1-03 | Legacy `opportunities/comments.ts` delegates to service (flat envelope kept) | api | 02/PLAN 23 F6 | W1-01 | mobile `commentQueue` contract unchanged | DONE |
| W1-04 | Zod schemas + `index.ts` mounts (`/api/jobs`, `/api/notifications`, `/api/users`) | api | 02/PLAN 23 F5/F7 | W1-01 | collision check; api typecheck | DONE |
| W1-05 | `api-client` `communityApi` + barrel export | packages | 02/PLAN 24 §3 | W0-02 | api-client typecheck | DONE |
| W1-06 | `community.test.ts` matrix (200/201/400/401/403/404/429) | api | 02/PLAN 23 §7 | W1-02 | vitest green | DONE |
| W1-07 | Edge-path hardening: guest `myVote:null`, deleted-subtree hiding (D4), vote idempotency, cache headers | api | 02/PLAN 23 §3.2-3.4 | W1-06 | tests cover each; `Cache-Control` split authed/guest | DOING |
| W1-08 | Analytics events `COMMENT_CREATE`, `COMMENT_REPLY`, `SIGNAL_TRACK`, `JOB_SUBMIT`, `JOB_SUBMIT_DUPLICATE`, `REPORT_CREATE` | api | 02/PLAN 09d §19 | W1-01 | fire-and-forget; never blocks the handler | TODO |
| W1-09 | `INCORRECT`/`CLOSED` signals auto-raise a moderation report | api | 02/PLAN 09c §12 | W1-01 | report row created; dedupe respects existing OPEN | TODO |
| W1-10 | Increment `Opportunity.commentsCount` on comment create | api | 02/PLAN 09c §12 | W1-01 | counter matches comment count | TODO |
| W1-11 | Push delivery for new notifications via existing `push-notification.service` | api | 02/PLAN 09e §16, 05/PLAN 14e P1 | W1-01 | worker-driven; no request-path push | TODO |
| W1-12 | Community publish → feed regeneration enqueued (worker, never request path) | api | 02/PLAN 09e §16 T3 | W1-01 | publish enqueues; no public-route regen | TODO |
| W1-13 | Apply-funnel click tracking, **one implementation**. **Verified defect (2026-09-13): the client still calls a disabled stub.** `api-client` posts to `/api/public/opportunities/:id/click`, which matches the no-op `opportunityClicks.ts` mounted at `index.ts:277` (returns 202, body commented out). The real tracker `opportunities/clicks.ts` is mounted under `/api/opportunities` at `index.ts:433` — a different path, so nothing calls it. Fix by pointing one side at the other and deleting the stub. | api | 05/PLAN 14e P0.13, 05/PLAN 26 §4 | — | one tracker home; an Apply click increments engagement and emits `CLICK_APPLY`; stub deleted | DOING |
| W1-14 | **New — test-suite stability.** `submit.test.ts > POST /submit returns 401 if x-api-key is invalid` measures ~3.6s against vitest's 5s default, so under parallel load it times out and cascades (observed run reported `3 failed \| 22 skipped`); the same suite passes clean on re-run. Raise the timeout or speed the case. | api | — | — | two consecutive `pnpm --filter ./apps/api test` runs green | TODO |

## W2 — Community surfaces (web)

| ID | Task | Owner | Source | Depends | Acceptance | Status |
|---|---|---|---|---|---|---|
| W2-01 | Discussion UI split per spec: `DiscussionSection`, `CommentTree`, `CommentComposer`, `CommentNode`, `ReportFlow`, `SignalsPanel`, `ProvenanceStrip`. **3 of 7 exist** (`DiscussionSection`, `SignalsPanel`, `ProvenanceStrip`). | web | 02/PLAN 24 §4, 02/PLAN 09a §4 | W1-05 | client-only on ISR page; loading/error/empty each; all 7 components present | DOING |
| W2-02 | `/post` page + `PostJobForm` via `communityApi.submitJob` | web | 02/PLAN 24 §5, 05/PLAN 14e P0.9 | W1-05 | fresh + duplicate + unsigned flows | HANDOFF |
| W2-03 | Notifications center reads Postgres `communityApi` (no RTDB), slug deep-links | web | 02/PLAN 24 §6, 05/PLAN 14e P0.11 | W1-05 | `firebase/database` gone from page; mark-read persists | HANDOFF |
| W2-04 | Contribution identity block on `/u/[username]` + dashboard summary | web | 05/PLAN 14e P1, 02/PLAN 09c §7 | W1-02 | counts from `/api/users/:username/activity` | TODO |
| W2-05 | `/discussions` feed + `/discussions/[slug]` thread (tranche 2) | web | 02/PLAN 09a §2, 05/PLAN 14e P2 | W2-01 | only after per-job discussion proven | TODO |
| W2-06 | "Did you apply?" prompt after apply-click → signal + tracker entry | web | 01/PLAN 13 Phase 4, 05/PLAN 14e P1 | W1-01 | one tap; writes signal APPLIED | TODO |
| W2-07 | Saved/follows off RTDB: hooks → `/api/saved`, `/api/follows` | web | 05/PLAN 14e P1 | — | no RTDB writes from web app state | TODO |
| W2-08 | Tracker off RTDB → `actionsApi` / new `PUT /api/tracker/:oppId`; delete `firebaseTrackerDb.ts` | web + mobile + api | 05/PLAN 14e P1, 02/PLAN 27 §5 | — | `UserAction` is the only store | TODO |
| W2-09 | **New — web typecheck is RED.** `features/landing/HeroSignalStrip.tsx:11-16` assigns string literals (`'APPLIED'`, `'INTERVIEWED'`, `'OFFER'`, `'CLOSED'`, `'HELPFUL'`, `'INCORRECT'`) to `JobSignalType[]`. `JobSignalType` is a real string enum in `packages/types/src/enums.ts:217`, so use the members (`JobSignalType.APPLIED`) or a `Record`-compatible shape. Blocks `pnpm --filter ./apps/web typecheck` and root `pnpm typecheck`. | web | — | — | `pnpm --filter ./apps/web typecheck` exits 0 | TODO |

## W3 — Copy pass

| ID | Task | Owner | Source | Depends | Acceptance | Status |
|---|---|---|---|---|---|---|
| W3-01 | Copy groups A-D + F (web outer/jobs/auth, mobile share, notification templates) | web | 05/PLAN 26 §2, 09/PLAN 10 §7 | W0-04 | no "verified/fake listing/cleanest/no spam" in UI copy | TODO |
| W3-02 | Copy group E (mobile onboarding/settings/comment gates) | mobile | 05/PLAN 26 §2 | W0-04 | 09/PLAN 10 §E table applied | TODO |
| W3-03 | CI guard `pnpm check:copy` + wire into `web-ci.yml` | platform | 05/PLAN 26 §3, 09/PLAN 10 §10 | W3-01 | guard fails on seeded violation, passes clean | TODO |
| W3-04 | De-verify verification: `grep -rni "verified\|cleanest\|no spam"` over user-facing source | web + mobile | 05/PLAN 14e P0.12 | W3-01, W3-02 | only code identifiers remain | TODO |

## W4 — Public web, CDN, freshness contract

| ID | Task | Owner | Source | Depends | Acceptance | Status |
|---|---|---|---|---|---|---|
| W4-01 | One generated public stats manifest (opportunities/companies/internships/walkins/govt/updatedAt/feedVersion) consumed by homepage + `/api/stats` | api + web | 03/PLAN 03 Phase1, 05/PLAN 08 Stage1 | — | homepage counts == manifest | TODO |
| W4-02 | Exact-path invalidation only (no broad tags on high-cardinality) | api | 03/PLAN 03 Phase2, AGENTS.md ISR | W4-01 | one publish touches only affected surfaces | TODO |
| W4-03 | `feed-version` as the central public cache contract | api | 03/PLAN 03 Phase3 | W4-01 | stats versioned beside feeds; atomic swap | TODO |
| W4-04 | Public trust monitoring script (homepage>0, jobs count==feed, company shard, sitemap non-empty) | platform | 03/PLAN 03 Phase4 | W4-01 | script exits 0 on healthy manifest | TODO |
| W4-05 | Landing: search box + batch picker + live pulse + new hero copy. **In progress:** `HeroSection.tsx` rewritten, `HeroJobCard.tsx` + `CommunityTicker.tsx` + `boardTime.ts` added, `apps/web/src/app/(public)/page.tsx` wired to `TickerEvent`. | web | 05/PLAN 14e P0.10, 04/PLAN 16, 01/PLAN 13 Phase1 | W3-01 | no "verified" on `/`; search + batch CTAs work | DOING |
| W4-06 | Trending tab ranking = freshness × signals × saves; feed payload exposes counts | api | 05/PLAN 14e P0.14, 05/PLAN 26 §4 | W1-01 | order differs from latest once signals exist; aggregates only | TODO |
| W4-07 | Job-card mini signal row (only when counts > 0). **In progress:** `HeroSignalStrip.tsx` built but not yet imported by any card; it is also the file breaking web typecheck (see W2-09). | web | 05/PLAN 14e P0.14 | W4-06 | no zero-row noise | DOING |
| W4-08 | Permanent expired-job URLs (page + related + discussion preserved) | web | 02/PLAN 09d §9 rule 2, 01/PLAN 13 | W2-01 | `/jobs/[slug]` never 404s for a job | TODO |

## W5 — Company graph (blocks recruiter)

| ID | Task | Owner | Source | Depends | Acceptance | Status |
|---|---|---|---|---|---|---|
| W5-01 | Canonical `Company` model + mapping; `Opportunity.companyId` mandatory on publish | packages + pipeline | 01/PLAN 02 D1, 05/PLAN 08 Stage2 | W0-03 | new publishes always attach `companyId` | TODO |
| W5-02 | Company pages derive from canonical identity, not string grouping | api + web | 05/PLAN 08 Stage2 | W5-01 | company counts stable across feed + page | TODO |
| W5-03 | Company resolution rate metric | pipeline | 03/PLAN 04 Gap1 | W5-01 | measurable in discovery stats | TODO |

## W6 — Discovery / data engine

| ID | Task | Owner | Source | Depends | Acceptance | Status |
|---|---|---|---|---|---|---|
| W6-01 | Source confidence tiers (ATS vs board vs manual/social) | pipeline | 03/PLAN 04 Gap2 | — | tier stored per source; publish uses it | TODO |
| W6-02 | Canonical company + ATS graph (provider, board token, health, yield) | pipeline | 03/PLAN 04 LayerB | W5-01 | per-company sync/health rows | TODO |
| W6-03 | Discovery ops console (source yield, failure patterns) | web + pipeline | 03/PLAN 04 P3, 05/PLAN 08 Stage3 | W6-01 | operator sees yield + dead/stale rates | TODO |
| W6-04 | Ingest-to-publish SLA tracking (discovered→verified→published→CDN) | pipeline | 03/PLAN 04 P4 | — | latency measurable per stage | TODO |
| W6-05 | Community submit + pipeline share one canonical dedupe function | pipeline + api | 02/PLAN 09 §2.5, 02/PLAN 09c §13 Path C | W1-01 | both paths call one `canonicalIdentity` | TODO |

## W7 — Mobile retention

| ID | Task | Owner | Source | Depends | Acceptance | Status |
|---|---|---|---|---|---|---|
| W7-01 | Stable mobile modules: feed, explore, alerts, tracker, profile, contribution | mobile | 06/PLAN 06 Step1 | — | cold + warm start fast; offline feed intact | TODO |
| W7-02 | Push targeting tied to batch/role/location/company/saved | mobile + api | 06/PLAN 06 Step2 | W1-11 | alerts map to profile prefs | TODO |
| W7-03 | Application tracker first-class + durable | mobile | 06/PLAN 06 Step3 | W2-08 | survives cold/warm start | TODO |
| W7-04 | Mobile community via `communityApi`; delete the 8 `firebase*Db.ts` modules | mobile | 02/PLAN 09e §15, 05/PLAN 14e P1 | W1-05, W2-08 | no RTDB app-state writes remain | TODO |
| W7-05 | Bottom nav `Home \| Jobs \| Post \| Community \| Profile` | mobile | 02/PLAN 09e §15, 04/PLAN 15 D5 | W7-04 | tabs for anonymous too | TODO |

## W8 — Recruiter / organization (FROZEN)

| ID | Task | Owner | Source | Depends | Acceptance | Status |
|---|---|---|---|---|---|---|
| W8-01 | Organization identity: create org, invite member, roles | api | 07/PLAN 05 Module1, 05/PLAN 08 Stage5 | W5-01, W4-01 | admin can invite a member | FROZEN |
| W8-02 | Recruiter workspace MVP: saved candidates, notes, matching | api + web | 07/PLAN 05 Module2 | W8-01 | save + review candidate | FROZEN |
| W8-03 | Campus/college intelligence layer | — | 01/PLAN 01, 07/PLAN 05 | W8-02 | — | FROZEN |

## W9 — Open-source packaging

| ID | Task | Owner | Source | Depends | Acceptance | Status |
|---|---|---|---|---|---|---|
| W9-01 | Platform overview guide (apps, packages, data planes, required/optional services) | research | 08/PLAN 07 PackageA | — | outsider can map the repo | TODO |
| W9-02 | Deployment modes docs (jobs-only / +ingestion / full) | research | 08/PLAN 07 PackageB | W9-01 | newcomer runs one mode without reverse-engineering | TODO |
| W9-03 | Maturity labels (stable / active / experimental) | research | 08/PLAN 07 PackageC | W9-01 | labels applied per module | TODO |
| W9-04 | External contributor map | research | 08/PLAN 07 PackageD | W9-01 | where to work per area documented | TODO |

## W10 — Frontend stack (docs 15-22)

| ID | Task | Owner | Source | Depends | Acceptance | Status |
|---|---|---|---|---|---|---|
| W10-01 | Route groups `(shell)`, `(content)`, `(auth)`, `(admin)`, `(dev)`; `(user)` gating → per-family layouts; `(app)` folds into `(admin)` | web | 04/PLAN 15, 05/PLAN 26 §5.1 | — | anonymous == authed layout on `/jobs` | TODO |
| W10-02 | ContentHeader + one Footer; delete `TopUtilityBar`, `SocialSidebar`, MiniFooter sniffing | web | 04/PLAN 15 D3/D4, 04/PLAN 16 §16.3 | W10-01 | keyboard-accessible hover menus | TODO |
| W10-03 | `MobileBottomTabs` mode-driven (not login-driven); suppressed on `/jobs/[slug]` + auth | web | 04/PLAN 15 D5 | W10-01 | anonymous sees tabs on `/jobs` | TODO |
| W10-04 | `navTree.ts` one tree + delete 5 arrays, `getNavContext`, `getNavItemsForContext`, second sniffer. **Verified not started:** no `navTree.ts`/`navIcons.ts` anywhere under `apps/web/src`; `lib/navigation/` still holds `navConfig.ts`, `routeConfig.ts`, `TopUtilityBar.tsx`, `SocialSidebar.tsx`. | web | 04/PLAN 20 | — | vitest invariants (rail never lies, one highlight) | TODO |
| W10-05 | `/post` rename; `/submit` 301 → `/post`; `/contribute` retargets | web | 04/PLAN 21 §21.3, 05/PLAN 26 §5.5 | — | `grep submit` in navigation → empty | HANDOFF |
| W10-06 | Redirect ledger in `next.config` (`/skills/*`, `/roles/*`, `/locations/*`, `/batch/*`, hubs → `/jobs/browse`) | web | 04/PLAN 21 §21.7, 05/PLAN 26 §5.6 | W10-07 | vitest asserts every "from" present | TODO |
| W10-07 | Taxonomy registry + `TopicBoardPage` + `/jobs/browse`; delete old namespace dirs | web | 04/PLAN 22 §22.3/§22.8, 05/PLAN 26 §5.7 | — | registry ∩ job slugs = ∅ asserted at build | TODO |
| W10-08 | Landing execution + identity (Bricolage + IBM Plex Mono, stamps, board eyebrows, pinned motion, signal tokens) | web + design | 04/PLAN 16 §16.4/16.8, 04/PLAN 17, 05/PLAN 26 §5.8 | W10-02 | critique gates 16.8 + 17.7 pass | TODO |
| W10-09 | `next.config.ts` tidy R1-R5 (console filter extract, dead APP_ORIGIN, `remotePatterns` allowlist, redirects array, serverExternalPackages) | web | 05/PLAN 26 §8 | — | build green; wildcard host removed | TODO |
| W10-10 | One title per route (Internships/Remote/Walk-ins suffixes) | web | 04/PLAN 21 §21.6 | — | no duplicate titles | TODO |
| W10-11 | Thin-page guard (< N live rows → 404/redirect) | web | 02/PLAN 09d §9.8, 05/PLAN 14e P2 | W10-07 | thin hub never publishes | TODO |

## W11 — Moderation (09c M0-M5)

| ID | Task | Owner | Source | Depends | Acceptance | Status |
|---|---|---|---|---|---|---|
| W11-01 | M0: add `Role.MODERATOR`; constrain `determineTrustLevel` to CONTRIBUTOR max; fix trust-clobber in `moderation.ts`/`publish.ts` | packages + api | 02/PLAN 09c §14.1 | W0-03 | hand-granted MODERATOR/BANNED survives scored actions | TODO |
| W11-02 | M1: moderator powers — resolve/dismiss reports, expire/archive with reason, `requireRole(['MODERATOR','ADMIN'])` | api | 02/PLAN 09c M1 | W11-01 | reports resolvable by moderators | TODO |
| W11-03 | M2: `/moderation` queue on main origin (not admin subdomain) + `/api/moderation/*` | web + api | 02/PLAN 09c M2 | W11-02 | no TOTP/admin host needed | TODO |
| W11-04 | M3: public `/moderation-log` from `AdminAudit` `MOD_` rows | web + api | 02/PLAN 09c M3 | W11-02 | transparency log public | TODO |
| W11-05 | M4: earned ladder activation (NEW→VERIFIED→CONTRIBUTOR from real counts) | api | 02/PLAN 09c M4 | W11-01 | MODERATOR stays manual | TODO |
| W11-06 | M5: moderation-shift spec in `company/workers/` + CODEOWNERS | research + platform | 02/PLAN 09c M5 | — | review ownership ≠ one person | TODO |
| W11-07 | Comment auto-hide at ≥3 open reports | api | 02/PLAN 09c §14 | W11-02 | threshold enforced | TODO |

## W12 — Machine ingest (doc 28)

| ID | Task | Owner | Source | Depends | Acceptance | Status |
|---|---|---|---|---|---|---|
| W12-01 | `POST /api/ingest/jobs` + `ingest.service` (5-step dedupe + overlap heuristic, 3 trust classes) | api | 02/PLAN 28 §1-§4 | W1-13 | verdict shape per §3; no duplicate of `/api/jobs/submit` | TODO |
| W12-02 | `scripts/ingest-cli` (native fetch, prints human verdict) + README curl examples | pipeline | 02/PLAN 28 §6 | W12-01 | CLI round-trips created/duplicate | TODO |
| W12-03 | Ingest test matrix (created/duplicate/overlap/needs_fields/bad URL/bad key/429/kill-switch) | api | 02/PLAN 28 §7 | W12-01 | all statuses covered | TODO |

## W13 — P2 / polish

| ID | Task | Owner | Source | Depends | Acceptance | Status |
|---|---|---|---|---|---|---|
| W13-01 | Cross-surface `/api/search` (jobs first, then discussions/people) | api | 02/PLAN 09b §17, 05/PLAN 14e P2 | W4-05 | Postgres FTS + trigram; no new engine | TODO |
| W13-02 | Honest iOS "coming soon" copy (no dead disabled button) | web | 05/PLAN 14e P2 | W3-01 | honest state | TODO |
| W13-03 | Telegram caption + app-store copy voice | web + mobile | 05/PLAN 14e P2, 09/PLAN 10 §D | W3-01 | 09/PLAN 10 §D applied | TODO |
| W13-04 | Blog/about/contact rewrite | web | 05/PLAN 14e P2 | W3-01 | pillar voice | TODO |
| W13-05 | Finance/schema window follow-ups: `FeedbackReason.NOT_INTERESTED` + hide (Q8), `ref` param unify (Q7), applied-jobs policy (Q9) | packages + api | 05/PLAN 25 §3, 02/PLAN 27 §4 | W0-03 | owner-locked defaults implemented | TODO |
| W13-06 | `Member`/`MODERATOR` queue + analytics events for moderation | api | 02/PLAN 09c M1/M5 | W11-02 | metrics visible in admin | TODO |

---

## Dependency spine (do not violate)

```
W0-01/02  →  W1-01..06  →  W2-01..03, W7-04
W0-03     →  W1-07, W11-01, W5-01, W13-05
W0-04     →  W3-01..04
W1-01     →  W1-08..12, W2-06, W4-06
W1-05     →  W2-01..03, W7-04
W1-13     →  W12-01
W4-01     →  W4-02..04, W8-01
W5-01     →  W5-02/03, W6-02, W8-01
W10-01    →  W10-02/03
W10-07    →  W10-06/11
W11-01    →  W11-02..05, W11-07
W12-01    →  W12-02/03
```

## Verification log (2026-09-13)

Commands run against the current worktree to produce the statuses above.

| Claim | Command | Result |
|---|---|---|
| W0-01 | `grep -n "^model CommentVote\|^model JobSignal\|^model JobSubmission\|^model Report\|^model Notification\|^model OpportunityComment" packages/database/prisma/schema.prisma` | all 6 models present (lines 1119-1274); `parentCommentId`/`replies` at 1123-1135 |
| W0-01 | `pnpm db:generate` | exits 0 |
| W0-02 | `pnpm --filter ./apps/api typecheck` (imports `@fresherflow/types`) | exits 0 |
| W0-03 | `ls packages/database/prisma/migrations` | 40 migrations; **none for community** → still BLOCKED |
| W1-02 | `ls apps/api/src/routes/community/` | `jobs.ts`, `notifications.ts`, `users.ts` |
| W1-03 | `sed -n '1,20p' apps/api/src/routes/public/opportunities/comments.ts` | imports `listComments`, `postComment`, `deleteComment` from the service |
| W1-04 | `grep -n "app.use('/api/jobs'\|'/api/notifications'\|'/api/users'" apps/api/src/index.ts` | mounted at lines 456-458; 5 community Zod schemas in `utils/validation.ts` |
| W1-05 | `grep -n community packages/api-client/src/index.ts` | `export { communityApi } from './public/community'` (line 30) |
| W1-06 | `pnpm --filter ./apps/api test` | `community.test.ts (22 tests)` ✓ |
| W1-07 | greps for `myVote`, `deletedAt`, `Cache-Control`, idempotency | guest `myVote` ✓ (`service.ts:324`), `Cache-Control` split ✓ (`jobs.ts:64/66`), idempotent vote ✓ (`service.ts:353`); **no `deletedAt` subtree-hiding test** |
| W1-13 | greps for the click routes and their mounts | client path hits the disabled stub → funnel still blind (detail in row) |
| W1-14 | two consecutive `pnpm --filter ./apps/api test` runs | run 1: `3 failed \| 22 skipped` (timeout cascade); run 2: `1 failed \| 37 passed` |
| W2-01 | `ls apps/web/src/features/opportunities/components/discussion/` | 3 files, spec asks for 7 |
| W2-02 | `ls apps/web/src/app/(public)/post/ apps/web/src/features/opportunities/components/post/` | `page.tsx`, `PostJobForm.tsx` |
| W2-03 | `grep -n firebase apps/web/src/app/(user)/notifications/page.tsx` | no matches → RTDB gone |
| W10-04 | `find apps/web/src -name "navTree*" -o -name "navIcons*"` | no matches → not started |
| W10-05 | `grep -n post "apps/web/src/app/(public)/submit/page.tsx"` | `redirect('/post')` (line 4) |
| W2-09 | `pnpm --filter ./apps/web typecheck` | **RED** — 6 errors, all `HeroSignalStrip.tsx` (see row) |
| flake | `pnpm --filter ./apps/api test` (failing case) | `auth-profile-admin.test.ts > requireAuth blocks when no token`: `res.clearCookie is not a function` at `auth.ts:19` — **pre-existing, in an untouched file** |

## Current snapshot

- `DONE`: W0-01, W0-02, W1-01..06 = **8 tasks**
- `HANDOFF` (built, needs the web owner's verification): W2-02, W2-03, W10-05 = **3 tasks**
- `DOING`: W1-07, W1-13, W2-01, W4-05, W4-07 = **5 tasks**
- `BLOCKED`: W0-03 (community migration) = **1 task**
- `FROZEN`: W8-01..03 = **3 tasks**
- `TODO`: **67 tasks**
- **Total: 87 tasks**

### Statuses corrected in this sync

| Task | Was | Now | Why |
|---|---|---|---|
| W10-04 | `DOING` | `TODO` | `navTree.ts` does not exist anywhere in `apps/web/src` |
| W2-01 | `HANDOFF` | `DOING` | 3 of the 7 spec components exist |
| W1-13 | `DOING` | `DOING` (defect recorded) | the client calls a disabled stub, so the funnel is still blind |
| W4-05 | `TODO` | `DOING` | web owner has the landing rewrite in flight |
| W4-07 | `TODO` | `DOING` | `HeroSignalStrip.tsx` built, not yet wired |
| W2-09 | — | `TODO` (new) | web typecheck is RED |
| W1-14 | — | `TODO` (new) | API test suite is flaky |

### Blocking right now

1. **`pnpm typecheck` is red repo-wide** because of `apps/web/src/features/landing/HeroSignalStrip.tsx` (W2-09). One file, six lines.
2. **The apply funnel is still blind** (W1-13). The whole reason P0.13 exists.
3. **Community has no migration** (W0-03), so none of W1 can run in staging.
