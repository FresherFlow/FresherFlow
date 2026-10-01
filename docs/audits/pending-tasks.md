# Web audit — pending task checklist

Derived from `docs/audits/*.md` and `docs/duplication-audit.md`.

**Status key:** `[x]` fixed and verified · `[ ]` open · `[?]` confirm first — a
concurrent agent may have already changed it

**Verification pass:** 2026-09-30. Web typecheck 0 errors outside `.next/`;
web lint 0 errors / 97 warnings (baseline). API typecheck clean, 487 tests
passed / 10 skipped / 0 failed.

The concurrent agent has fixed a large share of the original audit. Every item
below marked `[?]` was re-checked against the current worktree; the grep evidence
is recorded inline. **Do not re-fix anything marked `[x]`.**

---

## Batch 1 — security, correctness bugs

### 1. `[?]` HIGH — Title template double-suffixes 10 public pages
`app/layout.tsx:96` sets `template: "%s | FresherFlow"`. Ten pages already end
their title with a pipe segment, so each renders a second brand suffix.
Reported by the routing agent; `layout.tsx` was outside its ownership.

Affected: `jobs/page.tsx:12`, `jobs/remote`, `jobs/internships:12`,
`jobs/full-time:12`, `jobs/part-time:12`, `jobs/browse:17`, `drives/page.tsx:12`,
`drives/off-campus:12`, `drives/walk-in:10`, `govt/page.tsx:12`.

Also fixes `jobs/browse` where `title` (`:17`) and `openGraph.title` (`:14`)
disagree.

**Fix:** strip the trailing `| <segment>` from the ten titles; let the template
own the brand. Pure string edit, no template change.

### 2. `[?]` HIGH — Unguarded `parseInt` in `onToggleAmPm`
`features/admin/opportunities/useOpportunityForm.ts:257`. `parseInt(hourPart, 10)`
with no `Number.isFinite` guard. Non-numeric input yields
`"NaN:undefined"` in `expiryTime`. Identical bug class to the `formatTime` fix
just landed in `opportunityPayload.ts`.

**Fix:** one-line guard — `if (!Number.isFinite(hours)) return;`

### 3. `[ ]` HIGH — `ff_logged_in` is a trust boundary on a client-writable cookie
`lib/config/auth.ts:29,41` accepts `ff_logged_in` as proof of login. It is set
**without `httpOnly`** (`AuthContext.tsx:118`, `LoginForm.tsx:140`), so any script
can set it. The proxy's user-path gate and the auth bounce both honour it.

**Fix:** treat `ff_logged_in` as a UI hint only. The real credential is the
`accessToken` cookie. Decide and document which surface still needs the hint.

### 4. `[ ]` HIGH — `AuthContext` auth-listener cleanup is a no-op
`lib/auth/AuthContext.tsx:484-505`. `unsubscribe` is assigned inside an async
`import().then(...)`, so the returned cleanup at `:502-504` almost always sees
`undefined` and the `onAuthStateChanged` listener **leaks**. StrictMode doubles
it.

**Fix:** hold the import promise and unsubscribe after it resolves, or move
subscription into a stable module scope.

### 5. `[ ]` HIGH — `useCategoryPageState` URL writer silently loses writes
`hooks/useCategoryPageState.ts:604-626`. The cleanup clears `replaceTimerRef` on
every dep change, but the body only re-arms when `changed === true`. A render
with a changed dep and `changed === false` clears the pending timer and never
re-arms — that URL write is lost.

### 6. `[ ]` HIGH — `isFirstRender` broken under StrictMode
`useCategoryPageState.ts:385`. Mount → effect runs → flag false → StrictMode
replays the effect with it already false, so the second pass re-parses the URL
into fresh arrays, rebuilding every filter identity and resetting scroll.

### 7. `[ ]` HIGH — `useOpportunityDetail` load effect has no request-id guard
`hooks/useOpportunityDetail.ts:199-224`. Reads `opp?.id` and writes `opp`, with
`opp?.id` in deps — re-runs after every `setOpp`. No request-id guard, so a
double-invoked load can resolve out of order. `useOpportunitiesFeed` guards this
with `liveRequestIdRef`; this one does not.

### 8. `[ ]` MEDIUM — `useOpportunityDerivedState` freezes `now` at mount
`useOpportunityDerivedState.ts:17`. `useState(() => Date.now())` is stable, so
`upcomingTimelineEvents` (`:55`) never updates. A long-lived pane shows past
events as upcoming. `DetailTimeline.tsx:11` repeats the pattern independently.

---

## Batch 2 — regressions from the duplication pass

### 9. `[?]` MEDIUM — R1: `JobFilterBar` lost drive-radius + `next30Days`
`FilterDropdownBar.tsx` was deleted (1087 lines) without porting the two things
only it had. Verified still missing:

- `next30Days` appears in `JobsFilterBar.tsx:379,388` and
  `MobileFilterDrawer.tsx:24` — **but NOT in `JobFilterBar.tsx`**
- `driveRadius` — no occurrence in `JobFilterBar.tsx` at all

So on the `OpportunitiesFeedClient` route, desktop has no "Next 30 Days" and no
"Distance" pill while the drawer has both. New desktop/mobile asymmetry.

**Fix:** port both into `JobFilterBar.tsx` from `JobsFilterBar.tsx`, which
already has them.

### 10. `[?]` MEDIUM — R2: two save buttons in the split-pane government view
`OpportunityDetailPane.tsx` — `handleToggleSave` at lines 90, 156, 225. Line 156
renders a header Save button; line 225 passes the handler to
`GovernmentJobDetailView`, which renders its own at `:849`.

**Fix:** one of the two. Recommend keeping the pane header and suppressing the
inner one, or dropping the header — state which and why.

---

## Batch 3 — type contract and URL safety

### 11. `[ ]` HIGH — Opportunity write path is `any` end to end
`lib/api/admin.ts:140` `createOpportunity: (data: any)`,
`:189` `updateOpportunity: (id: string, data: any)`. Nothing between the form
and the socket is typed. 195 `any` occurrences across `apps/web/src`.

**Fix:** type the payload against the API contract. The form already builds a
concrete shape in `opportunityPayload.ts`.

### 12. `[ ]` HIGH — 12 raw `href` sinks bypass `toSafeOutboundUrl`
`lib/utils/safeOutboundUrl.ts:16` exists and is correct but has ~5 call sites.
Raw scraped/DB URLs are used directly at:
`admin/opportunities/columns.tsx:181,267,272,318`; `AdminOpportunityPreviewModal.tsx:111`;
`admin/discovery/DiscoveryWorkspace.tsx:371`; `modals/PayloadModal.tsx:89`;
`modals/DryRunModal.tsx:90`; `DiscoveredJobsTab.tsx:254`;
`ProcessedJobsTab.tsx:376`; `OpportunityQueueTab.tsx:130`;
`AdminResourcesClient.tsx:896`; `TelegramBroadcastPanel.tsx:228`.

**Fix:** route every one through the helper. Replaces a confirmed-crashing
`includes()`-style check with `new URL()` + protocol validation per the repo
rule.

### 13. `[ ]` MEDIUM — `server-client.ts:112` unguarded `JSON.parse(text) as T`
Every server response in the app passes through this single assertion.

### 14. `[ ]` MEDIUM — Dead 162-line Zod schema, zero importers
`admin/opportunities/opportunityFormSchema.ts:20-162` plus
`opportunityFormDefaults` at `:161-162`. Adopting it is a refactor, not a fix —
decide delete or adopt.

---

## Batch 4 — cross-surface consistency

### 15. `[ ]` MEDIUM — Tracker vocabulary: three names for one action
| Concept | Detail | Tracker tab | Card |
|---|---|---|---|
| SELECTED | "Selected" | **"Offered"** | `OFFERED` |
| INTERVIEWED | "Interviewed" / "Attended" | **"Interviewing"** | `INTERVIEWING` |
| REJECTED | **absent from detail select** | "Rejected" | `REJECTED` |

Sources: `packages/utils/src/opportunity/display.ts:328-335`,
`jobs/tabs/AppliedTab.tsx:40-65`, `jobs/domain/trackerState.ts:8-15`.

A rejected listing shows a value the detail select cannot represent.
**Needs a product decision on canonical names before code changes.**

### 16. `[ ]` MEDIUM — `?role=` renders results with no chip and no control
`role` is read and written by `useCategoryPageState.ts:247,433,580` and counted,
but no bar renders a role control and the chip row omits it.

### 17. `[ ]` MEDIUM — `closingSoon`, `saved`, `govtCategory` also unreachable
Same class as 16. `govtCategory` additionally has a dead `GovtCategoryFilter`
export (`GovtPhaseTabs.tsx:129`) and an unused `categoryCounts` computation.

### 18. `[ ]` LOW — `apps/web/.env.example` is gitignored
`.gitignore:34` is `.env*`, which matches `*.example`. The `JWT_ADMIN_SECRET`
documentation added this session **will never ship**. The `AGENTS.md` env-table
row is currently the only documentation that reaches other developers.

**Fix:** add a `!.env.example` negation, or move the doc elsewhere.

---

## Batch 5 — accessibility and design system

### 19. `[ ]` MEDIUM — `globals.css:152` removes focus rings globally
`focus-visible:outline-none focus-visible:ring-0` on `*`. Ten components then add
`focus:outline-none` (not `focus-visible:`) with no replacement, so keyboard
focus is silently removed.

### 20. `[ ]` MEDIUM — 23 icon-only buttons with no accessible name
Includes `ui/Tooltip.tsx:37`, `jobs/JobFilterBar.tsx:109`,
`jobs/MobileFilterDrawer.tsx:105,130`, `GovernmentJobDetailView.tsx:838,942`,
`OpportunityDetailClient.tsx:279`, and ~15 more.

### 21. `[ ]` MEDIUM — 26 of 27 `aria-expanded` have no `aria-controls`
Only `AdminResourcesClient.tsx:296` pairs them.

### 22. `[ ]` MEDIUM — 7 `<div onClick>` with no role or keyboard handler
`dashboard/DashboardClient.tsx:68,82,96,110,124` (five nav "cards"),
`CaptionsTool.tsx:1031`, `AdminOpportunityPreviewModal.tsx:65`.

### 23. `[ ]` LOW — Light-mode contrast failures
`text-warning` 2.27:1, `text-success` 3.53:1, `text-error` 3.54:1,
`--color-border` on background 1.53:1. Dark mode passes. Tokens at
`globals.css:54-56,42,31`.

### 24. `[ ]` LOW — 17 hand-rolled empty states bypass `ui/EmptyState.tsx`
Includes a **second** empty-state primitive at
`profile/ProfileSectionCard.tsx:96`.

---

## Batch 6 — performance

### 25. `[ ]` HIGH — No list is virtualized
`@tanstack/react-virtual` is a declared dependency with **zero imports**. At 100
cards: 200 `useJobCardActions`, ~1,400 `CompanyLogo` hooks, 100
`ResizeObserver`s, 2 iconify fetches per skill pill.

### 26. `[ ]` MEDIUM — `/jobs/[slug]` fetches the feed index 3× per request
`jobs/[slug]/page.tsx:195,199,227-230`. Highest-traffic template on the site.
`companies/[slug]/page.tsx:240,285` re-fetches company metadata outside the
React `cache()` wrapper.

### 27. `[ ]` MEDIUM — `useOpportunitiesFeed` re-filters the whole feed on every bookmark toggle
`:349-475` memo depends on `savedJobsMap` (`:475`), so a toggle re-runs
filter → enrich → sort and allocates new object identities for every item,
re-rendering all mounted cards.

### 28. `[ ]` MEDIUM — `filterOpportunities.ts:202-208` allocates `qualMap` per opportunity
Inside the `.filter` callback instead of hoisted. And `:414-420` re-filters the
full `declaredYearsByJob` array once per year — O(years × jobs).

### 29. `[ ]` LOW — 6 declared dependencies with zero imports
`recharts`, `framer-motion` (only a type import), `supercluster`,
`@tanstack/react-virtual`, `@base-ui/react`, `dompurify`.

---

## Batch 7 — infrastructure, low risk

### 30. `[ ]` MEDIUM — `/api/cron` and `/api/pipeline` mounted before `csrfGate`
`apps/api/src/index.ts:305-313` mounts them; `csrfGate` is at `:321`. Those
routes are outside CSRF protection. They authenticate with `CRON_SECRET` /
`requireInternalApiKey`, so it is defence-in-depth rather than an open hole.
**Worth revisiting the mount order.**

### 31. `[ ]` MEDIUM — `ALLOWED_ORIGINS` production config risk
Now that Origin validation is live for authenticated web mutations (the Bearer
bypass was removed this session), if `ALLOWED_ORIGINS` is set in production it
must contain the web hosts or every web POST/PUT/PATCH/DELETE returns 403. The
default list covers `*.fresherflow.in` / `*.fresherflow.com`.

### 32. `[ ]` LOW — 12 dead `HUB_PATHS` entries
`app/api/revalidate/route.ts:18-38` still lists pre-rename names that are now
`next.config` redirect sources. Harmless — the guard is merely over-broad.

### 33. `[ ]` LOW — `next.config.ts` catch-all may swallow a real page
`:422-426` matches any single segment ending in `-` + 8 hex chars. Listed last
so real routes win.

### 34. `[ ]` LOW — No rate limit on three public API routes
`api/health/route.ts:5`, `api/sentry-example-api/route.ts:12`,
`api/og/job/preview/route.tsx:59`. Violates the root AGENTS rule that all public
API routes must be rate-limited. `sentry-example-api` also throws on every hit.

---

## Deliberately not planned

- **7-day admin token revocation gap** — a deactivated admin keeps write access
  until expiry, because the `/api/admin/**` handlers bypass `apps/api` and nothing
  re-checks the database. This is a design decision, not a bug. The user has not
  decided on it.
- **Form layer migration to React Hook Form / Zod** — a large refactor, not a
  fix. Deferred.
- **46% of source is `'use client'`; 42 files need no directive** — real, but a
  broad architectural change.
- **`packages/ui` adoption** (9 primitives, web imports 4) — worth doing, but
  wide.
- **Duplicate `actionType` mapping tables across 4 sites** — folded into item 15.
