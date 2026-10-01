# Audit 05 — Admin web surface

Read-only. Scope: `app/(admin)`, `app/admin`, `features/admin`, any `Admin*`
component.

## Correct as-is — do not "simplify" these

- The `DataGrid` primitive is genuinely well-factored — facets, server
  pagination, controlled sort/search, sticky columns, bulk bar, `bare`/`card`
  variants, all in `ui/data-grid/DataGrid.tsx:208-638`
- Route-level auth is layered correctly for pages: proxy cookie gate
  (`src/proxy.ts:138-144`), per-route `canAccessAdminRoute`
  (`AdminLayoutClient.tsx:127-157`), 401/403 screens with exit
  (`AdminLayoutClient.tsx:106-155`)
- Bulk destructive actions on the listings grid and user table **do** name what is
  affected (`useAdminOpportunityActions.ts:161`, `UsersDialogs.tsx:227-241`)
- `moderatorAccess.ts:12-17` documents that the API's `requirePermission` is the
  real gate, and `src/proxy.ts:133-137` says the proxy is only a coarse gate.
  **That documentation is accurate — the server check does exist, just not in
  this app**
- Several files carry unusually good inline rationale comments. These are correct
  and should not be collapsed

---

## 1. Route inventory

All admin routes sit under `app/(admin)/admin/`, guarded by
`app/(admin)/layout.tsx` (`AdminProvider` only) → `app/(admin)/admin/layout.tsx:11`
→ `AdminLayoutClient.tsx:82`. Proxy gate at `src/proxy.ts:138`.

| Route | File |
|---|---|
| `/admin` | `admin/page.tsx:6` (redirect only) |
| `/admin/login` | `admin/login/page.tsx:6` |
| `/admin/dashboard` | → `DashboardClient.tsx:76` |
| `/admin/analytics` | → `AnalyticsClient.tsx:33` |
| `/admin/alerts` | → `AlertsClient.tsx:42` |
| `/admin/opportunities` | → `OpportunitiesClient.tsx:23` |
| `/admin/opportunities/create` | → `CreateClient.tsx` |
| `/admin/opportunities/edit/[id]` | → `EditClient.tsx` |
| `/admin/profile-pages` | |
| `/admin/community-submissions` | `page.tsx:9` → `moderation/…/CommunitySubmissionsQueue` |
| `/admin/reports` | `page.tsx:16` |
| `/admin/users` | → `UsersClient.tsx:18` |
| `/admin/audit` | `page.tsx:11` |
| `/admin/resources` | `page.tsx:10` |
| `/admin/rooms` | `page.tsx:9` |
| `/admin/captions` | `page.tsx:6` |
| `/admin/push` | `page.tsx:9` |
| `/admin/feedback` | `page.tsx` |
| `/admin/telegram` | `page.tsx:9` |
| `/admin/settings` | `page.tsx:15` |
| `/admin/discovery` | `page.tsx` → `DiscoveryWorkspace.tsx:51` |

**Flags:**

- No admin page sits outside the admin layout. **Correct.**
- **Orphaned routes:** `/admin/telegram` and `/admin/alerts` have no sidebar
  entry (`admin-sidebar-data.ts:84-104` omits both) and no inbound link anywhere
  in `src` — grep for `/admin/telegram`, `/admin/alerts` returns only
  `NotificationsSummary.tsx:113` for alerts. `/admin/analytics` is reachable only
  as a dashboard tab (`DashboardClient.tsx:62`), not from nav.
- **No route-level `error.tsx` / `not-found.tsx` anywhere under `(admin)`**
  (glob confirms none). Every panel relies on in-component branches; a thrown
  render error hits the root boundary and blanks the shell.
- `admin/login` renders outside the shell by string-matching
  `pathname.includes('/login')` at `AdminLayoutClient.tsx:94,102,120,127`, not by
  a separate layout. Works, but brittle.

---

## 2. Table and list duplication — three tiers, inconsistently applied

**Tier A — `DataGrid`, 11 call sites, no local shell (correct):**
`AuditLogClient.tsx:169`, `UsersTable.tsx:94`, `ProfilePagesClient.tsx:348`,
`AdminResourcesClient.tsx:1223`, `AdminOpportunitiesTable.tsx:407`,
`DiscoveryRunsTab.tsx:158`, `DiscoveredJobsTab.tsx:338`,
`ProcessedJobsTab.tsx:480`, `JobBoardsTab.tsx:102`, `AtsAdaptersTab`,
`TargetCompaniesTab`. All thin — props + column defs.

**Tier B — hand-rolled table + `PaginationControls` (3 sites, all dead):**
`CareerBoardsTab.tsx:43-107`, `CrawlerRunsTab.tsx:47-116`,
`OpportunityQueueTab.tsx:184-187`. Each is 8–70 lines: raw
`Table`/`TableHeader`/`TableRow`, `useState(pageIndex/pageSize)`, `slice()` for
paging, a `useEffect` reset on data change, `<PaginationControls>` wired by hand.
**All three files have zero importers — 411 lines of duplicated shell.**

**Tier C — list that reimplements a table's semantics without a table:**
`RoomsClient.tsx:226-236` (card list, deliberate, documented `:6-9`),
`ProfilePagesClient.tsx:328-342` (intros card list, documented `:132-134`),
`FeedbackClient.tsx:460-514,529-572,587-617` (**3 hand-rolled card grids,
undocumented**), `CaptionsTool.tsx:860-1068` (grouped category list, ~200 lines).

### Pair divergences

| Pair | Shared | Diverges |
|---|---|---|
| `UsersTable.tsx:32-43` vs `statuses.tsx:21-37` | both `[{value,label}]` facet arrays, both `ALL='ALL'` | each surface declares its own — **three sentinels** |
| `FeedbackClient.tsx:624-670` vs `ui/AlertDialog` | both are "confirm a destructive action" | Feedback hand-rolls a fixed-overlay modal with its own `confirmState` machine (`:111-124`) and **bypasses the shared primitive entirely** |
| `ProcessedJobsTab.tsx:502-519` vs `DiscoveredJobsTab.tsx:361-384` | **~18 lines byte-identical** | nothing — same `Dialog`, same `"Confirm Deletion"`, same `Are you sure you want to delete {ids.length} job(s)?`, same raw `<button>`, same `bg-error text-paper` |
| `CareerBoardsTab.tsx:32-38`, `CrawlerRunsTab.tsx:27-32`, `OpportunityQueueTab.tsx:50-65` | 3-line header div + title + count, with **broken 1-space indentation** | dead code |

`FeedbackClient.tsx:384` also declares `className="p-4 md:p-8 … p-4 md:p-8"` —
**duplicate padding in the same attribute list.**

---

## 3. `ui/data-table` vs `ui/data-grid` — the split is not justified

- **`ui/data-table/DataTable.tsx:65-187`** — TanStack shell, `toolbar` render
  prop, `manualPagination`, no faceted filters, no sticky columns, no bulk bar,
  `max-h-[70vh]` inner scroller.
  **One consumer in the whole app, and it is not admin:**
  `jobs/detail/GovernmentJobDetailView.tsx:32`.
- **`ui/data-grid/DataGrid.tsx:208-638`** — the real admin primitive. Facet
  filters (`:454-473`), sticky cells, bulk bar, server pagination (`:96-109`),
  controlled sort/search, column visibility, two layout variants.

**The three admin files that import `data-table` (`CrawlerRunsTab.tsx:8`,
`OpportunityQueueTab.tsx:6`, `CareerBoardsTab.tsx:6`) are all dead.**
`ui/data-table` is a public-job surface only.

### `DataTablePagination.tsx` vs `data-grid-pagination.tsx` — four visible differences

| Behaviour | `DataTablePagination.tsx` | `data-grid-pagination.tsx` |
|---|---|---|
| Page-number list | `:49-75` inline closure | `:51-63` identical logic, extracted |
| Rows-per-page options | `:113` hardcoded `[10,20,50,100]` | `:46` same default, but `:27` accepts a `pageSizeOptions` prop |
| First/last buttons | `:124-132`, `:182-190` (`ChevronsLeft/Right`) | **absent** — no jump-to-first/last |
| Row range separator | `:91` en-dash `–` | `:106` hyphen `" - "` |
| Empty copy | `:93` `"No results found."` | `:112` `"No results"` |
| Selection copy | `:86` `"N of M row(s) selected."` (replaces the range) | `:95` `"N selected"` (coexists with the range) |
| Row-sizes control | `:109` `hidden sm:flex` — invisible on phones | `:70` `hidden sm:flex` too |
| Mobile nav | `:169-171` text `pageIndex+1 / pageCount` only | `:167-189` full prev/next + count |

**Two components, same intent, four visible differences.**

---

## 4. Stat / metric tiles

`ui/StatCard.tsx:35` is the shared primitive. **Four local re-implementations:**

1. `admin/discovery/DashboardTab.tsx:43-70` — local `StatCard`, `accent` colour
   prop, clickable card, compact number format. Used 4× at `:153,161,169,176`
2. `admin/analytics/AnalyticsClient.tsx:109-117` — local `MetricCard`. Used 7× at
   `:83-89`
3. `admin/alerts/AlertsClient.tsx:136-141` — inline tile markup in a `.map`, no
   named component. Same geometry as `AnalyticsClient:109`
4. `admin/dashboard/NotificationsSummary.tsx:83-86` and `:99-102` — the same tile
   **twice**, once skeleton once loaded, differing only by `bg-muted` vs `bg-card`

**Correct:** `OverviewTab.tsx:21,401-408` uses the shared `ui/StatCard`.
**Only one of five tile sites does.**

Note `ui/StatCard.tsx:23` types `icon` as
`React.ComponentType<{className?: string}>` — heroicons components also require
`title`, so **the primitive is narrower than its call site implies.**

---

## 5. Form duplication

**No form library is in use anywhere in admin.** Grep for
`react-hook-form|useForm|zodResolver` across `apps/web/src`: 3 hits, **all in
comments** — `useOpportunityForm.ts:1634` and `opportunityFormSchema.ts:8-9`
describing a *future* migration. `opportunityFormSchema.ts:20-162` is a complete
Zod schema that **zero code imports** (only self-references at `:159,:162`).

Three competing field conventions:

| Convention | Definition | Users |
|---|---|---|
| `SmartInput`/`SmartSelect`/`SmartTextarea` (`features/admin/ui/`) | wraps `ui/Field` + `ui/Input`/`ui/Select` | 10 opportunity form sections + `AdminResourcesClient.tsx:43-45` |
| bare `ui/Field` + `ui/Input` | `Field.tsx` used directly | `RoomsClient.tsx:41,437-470`; `login/_components/*` (`:6` each) |
| raw `<input>`/`<textarea>`/`<label>`, zero primitives | | `PushNotificationClient.tsx:89,107,124`; `AlertsClient.tsx:124,128`; `CaptionsTool.tsx:840`; `DiscoveryHeader.tsx`; `useOpportunityForm` internal fields |

Facts, not suggestions:

- `SmartInput.tsx:2` imports `cn` from `@repo/ui/utils/cn` and never uses it
- `SmartSelect.tsx:67` computes `cn(!value && "", className)` — `!value && ""` is
  always `""`, so `cn` is a pass-through **no-op**
- `SmartInput.tsx:2`, `SmartSelect.tsx:2`, `SmartTextarea.tsx:2` import from
  `@repo/ui/utils/cn` while the rest of admin imports `@/ui/cn` — **two `cn` homes**
- `features/admin/ui/InlineEditableField.tsx` is a **5-line comment-only file**
  (`:1-5`), a deprecated marker with no exports

---

## 6. Modals and confirmations

Shared primitives: `ui/AlertDialog` and `ui/Dialog`.

**Usage is correct in 4 places** — `UsersDialogs.tsx:167,186,207,224,268` (5
`AlertDialog`s, all naming the affected users), `OpportunitiesClient.tsx:153`,
`AdminResourcesClient.tsx:1341`, `CommunitySubmissionsQueue.tsx:155,520-523`
(documents *why* it rejected `AlertDialog` — inline reason step — and says so).

**Bypassing it:**

| Implementation | Line | Notes |
|---|---|---|
| `FeedbackClient.tsx:624-670` | hand-rolled fixed-overlay | full re-implementation of `AlertDialog`: own `confirmState` (`:111-124`), own overlay, footer, spinner |
| `ProcessedJobsTab.tsx:502-519` | raw `Dialog` + raw `<button>` | footer buttons are plain `<button className="px-4 py-2 …">`, not `ui/Button` |
| `DiscoveredJobsTab.tsx:361-384` | raw `Dialog` + raw `<button>` | **18 lines identical to the above** |
| `DiscoveryWorkspace.tsx:330-406` | hand-rolled fixed-overlay | **76-line** modal from raw `<div>`s, no `Dialog` primitive |
| `window.confirm` ×3 | `PasskeyManager.tsx:96`, `TwoFactorSetup.tsx:66`, `useOpportunityForm.ts:735` | native confirm, unstyled |

**Destructive actions with NO confirmation:**

- `DiscoveryWorkspace.tsx:224-232` `runDorker` — starts a full crawl
- `DiscoveryWorkspace.tsx:176-189` `runAllCompanies` — batch ingestion across all
  targets, wired to a bare button labelled "Run crawlers"
  (`DashboardTab.tsx:142-147`)
- `DiscoveryWorkspace.tsx:191-200` `runAllBoards` — same, "Run All Boards"
- `JobBoardsTab.tsx:86` / `CareerBoardsTab.tsx:80` — "Scrape board now"
- `TargetCompaniesTab` run target, `AtsAdaptersTab` batch run
- `OpportunityQueueTab.tsx:57-63` "Publish All" (dead file, but the pattern is
  live in `DiscoveryWorkspace`'s `onPublishAll` prop path)

**Confirmations that do not name what is affected:**

- `FeedbackClient.tsx:312` — "delete this comment?" — no comment text, no job
- `FeedbackClient.tsx:331` — "dismiss this opportunity report?" — no job title
- `FeedbackClient.tsx:350` — "delete this app feedback?" — no message
- `ProcessedJobsTab.tsx:507` / `DiscoveredJobsTab.tsx:366` — "delete {ids.length}
  job(s)?" — count only, never which
- `AdminResourcesClient.tsx:1344` — "permanently delete this resource?" — no title
- `useOpportunityForm.ts:735` — `confirm("Are you sure?")` — names nothing

**By contrast**, `useAdminOpportunityActions.ts:51,92,115,137` name the listing
title, and `UsersDialogs.tsx:227-241` name up to five users plus "+N more".
**Correct.**

---

## 7. Client-side-only authorization

Layout-level permission gating **is** mirrored server-side by design, and the code
says so (`moderatorAccess.ts:12-17`, `src/proxy.ts:133-137`). Nav filtering is
`admin-sidebar-data.ts:128-138`; palette filtering `AdminCommandMenu.tsx:31-32`.
**Correct as documented.**

### Unguarded capabilities

**1. The `/admin/discovery` crawler controls have no in-app authz.** Every handler
under `app/api/admin/discovery/**` is wrapped only in `withRateLimit`, keyed on IP
only — no cookie, no session, no role. Confirmed: grep for
`requireAdmin|adminAccessToken|401|403` across `app/api/admin` returns **no
files**. See [`04-auth-security.md`](04-auth-security.md) §1 for the full list and
severity — this is the CRITICAL one.

**2. `PasskeyManager.tsx:75`** reads `process.env.NEXT_PUBLIC_ADMIN_EMAIL!`
client-side and passes it to `getRegistrationOptions`. **Registration eligibility
is a client-supplied string.**

**3. Two header components render links the nav correctly filters:**
`AdminOpportunitiesHeader.tsx:64-75` and `OverviewTab.tsx:373-382` render
"New listing" / "Moderate Reports" **unconditionally** — not gated on
`moderator.permissions`, unlike the nav (`admin-sidebar-data.ts:92`). A moderator
reaching `/admin/dashboard` sees links their permissions do not grant.
`AdminCommandMenu.tsx:31-32` filters correctly; these two do not.

**4. `CaptionsTool.tsx:830,1047`** gate on an `isAdmin` **prop**, hardcoded `true`
by its only admin caller (`CaptionsClient.tsx:6`).

---

## 8. Loading / error / empty states

| Panel | Loading | Error | Empty | Note |
|---|---|---|---|---|
| `/admin/users` | `:27-29` | `:31-46`, `:114-121` | via grid | complete |
| `/admin/audit` | `:107-109` | `:115-129`, `:146-153` | `:155-166` | complete; also distinguishes filtered-to-zero (`:92-105`) |
| `/admin/resources` | `:1235` | `:1212-1221`, `:1307-1314` | `:1186-1209` | complete |
| `/admin/rooms` | `:201-211` | `:192-199` | `:212-224` | complete |
| `/admin/profile-pages` | `:260-270`, `:359` | `:174-186`, `:204-211` | `:271-298`, `:368-396` | complete |
| `/admin/opportunities` | `:112` via grid | **none in component** | `:382-397` | **no error branch**; `useAdminOpportunities.ts` has no `error` state at all |
| `/admin/analytics` | `:55` | `:57-71` | **none** | no zero-metrics case |
| `/admin/dashboard` Overview | inline `—` | none | none | `OverviewTab.tsx:329-357` renders `'—'`/`'N/A'`; **`cdnStats.error` (`:94,101`) is never set to `true`** — the catch at `:197-207` sets `error: false` |
| `/admin/dashboard` Notifications | `:80-88` | `:89-95` | none | error text is **raw `e.message` at `:91`** |
| `/admin/alerts` | `:162` | `:163` | `:146-147`, `:164-166` | **raw `e.message`** |
| `/admin/reports` | `:152-163` | `:145-151` | `:164-171` | complete |
| `/admin/community-submissions` | `:395` | `:386` | `:413,431,475` | complete |
| `/admin/discovery` workspace | **none** | **none** | **none** | `DiscoveryWorkspace.tsx:104-126` — 5 fetches, **all `.catch(() => {})`**, errors swallowed. `engineStatus` flips to `'offline'` on health-check failure (`:100`) but **data errors render as "0"** |
| `DiscoveryRunsTab` | none | none | `:168-195` | |
| `DiscoveredJobsTab` | `:347` | **none** — `:68-70` `console.error` only | grid | |
| `ProcessedJobsTab` | `:488` | **none** — `:67-69` `console.error` only | grid | |
| `JobBoardsTab` | none | none | `:111-119` | |
| `AtsAdaptersTab` | none | none | `:154` | |
| `TargetCompaniesTab` | none | none | none | |
| `DashboardTab` | none | none | `:234-252` | |
| `/admin/feedback` | `:446-447` | toast only (`:261`) | `:453-458`, `:522-527`, `:580-585` | **no error state in the component** |
| `/admin/captions` | `:794-798` | toast only | `:857-858` plain `<p>` | |
| `/admin/push` | device count `:76` | toast only | n/a | |
| `/admin/telegram` | `:99-101`, `:239-242` | toast only | `:244` plain `<p>` | |
| `/admin/settings` | per-panel | toast only | per-panel | |
| `/admin/login` | `:39` | toast only | n/a | |

**Raw error text surfaced to the operator:**
`NotificationsSummary.tsx:91`, `AlertsClient.tsx:163`, `AnalyticsClient.tsx:61` —
all `e.message` rendered verbatim with no mapping, while sibling panels use
`getErrorMessage(e, '<fallback>')` (`RoomsClient.tsx:88`, `AuditLogClient.tsx:62`,
`AdminResourcesClient.tsx:1112`). **Inconsistent.**

**Silently swallowed:** `DiscoveryWorkspace.tsx:110,115,120,125` — four of five
fetches discard the error entirely.

---

## 9. Duplicated copy and constants

### Status maps — three definitions that disagree

| Map | Site |
|---|---|
| `STATUS_VARIANT` (11 keys) | `admin/opportunities/statuses.tsx:39-50` |
| `STATUS_VARIANT` (10 keys, overlapping but **disagreeing**) | `admin/discovery/statuses.tsx:38-49` |
| inline ternaries, no map | `AuditColumns.tsx:42-51`, `ProfileColumns.tsx:51-55`, `ProfileColumns.tsx:84-89` |

**`DRAFT` is `warning` in `opportunities/statuses.tsx:43` and `zinc/muted` in
`discovery/statuses.tsx:45`. `EXPIRED` is `warning` in `opportunities:46` and
`zinc` in `discovery:46`.** Same status, two colours, on two screens.

### Badge-label formatting — 5 sites

`formatStatusText` (`opportunities/statuses.tsx:52`),
`StatusBadge` inline (`discovery/statuses.tsx:52-54`),
`AuditColumns.tsx:67-76`, `ProfileColumns.tsx:45-55` and `:84-99` (two maps, both
with an unknown-value fallback), `AlertsClient`/raw text.

`ProfileColumns.tsx:51-55` and `:58-62` encode the **same three statuses twice**
(`INTRO_STATUS_META` and `INTRO_STATUS_OPTIONS`), the second **not derived** from
the first — while `INTRO_STATUS_FILTER_OPTIONS:66-69` **is** derived. Same file,
two conventions.

### `ALL = 'ALL'` sentinel declared 7×

`UsersTable.tsx:30`, `AdminOpportunitiesTable.tsx:32`, `ProcessedJobsTab.tsx:34`,
`DiscoveredJobsTab.tsx:35`, `AuditColumns.tsx:54`, `ProfileColumns.tsx:65`,
`ProfileColumns.tsx:92`.

### Provider sets — 4× with drift

`discovery/constants.ts:3-26`, `DiscoveryWorkspace.tsx:33-39`,
`AtsAdaptersTab.tsx:11-35`, `TargetCompaniesTab.tsx:11-14`.
**`constants.ts` is never imported** — `DiscoveryWorkspace` re-declares both sets
locally and adds `'getro'` and `'consider'` to `BOARD_SET` (`:34`) which the other
two lack.

### ATS detection — 3 implementations

- `admin/discovery/utils.ts:1-31` — **24 `includes()` substring checks**
- `admin/opportunities/columns.tsx:89-114` — `new URL()` + hostname match
- `jobs/utils/atsSource.ts:9`

**Same job, three answers.** `utils.ts:7` matches `greenhouse.io` anywhere in the
URL string; `columns.tsx:97-104` requires hostname or subdomain. (The
`includes()` form is the pattern `AGENTS.md` explicitly bans for security checks —
though here it is classification, not authorization.)

### `typeParamToEnum` — 2×

`listUtils.ts:5`, `formUtils.ts:317`. Both handle `walk-in`; only
`formUtils:322` handles `government`/`govt`.

### Filter-chip rows — 3×

`ReportsQueue.tsx:122-135`, `CommunitySubmissionsQueue.tsx:350-360`,
`ProfilePagesClient.tsx:244-254` — same `flex flex-wrap gap-2` + `aria-pressed`
Button pattern. `AlertsClient.tsx:98-129` does the same with raw `<label>` +
`NativeSelect`.

### `formatWhen` — 2×

`ProfilePagesClient.tsx:45-48` and `AuditColumns.tsx:78-83` — near-identical,
differing only in `toLocaleString(undefined, …)` vs
`toLocaleString(undefined, {dateStyle,timeStyle})`.

### `getPublicOpportunityUrl` — 3 paths

`listUtils.ts:90` (window-origin inference), `formUtils.ts:326` (localhost-aware),
plus a fourth at `listUtils.ts:86`.

### Page-description constants

`AuditLogClient.tsx:27` and `ProfilePagesClient.tsx:34` both define
`PAGE_DESCRIPTION`; `UsersClient.tsx:16` defines a third. Not content duplication —
the same convention re-declared 3×.

---

## 10. Dead admin code

Zero importers, verified by grepping all of `apps/web/src` (counts are total
occurrences including self-definition).

| File | Lines | Occurrences |
|---|---:|---|
| `admin/discovery/components/CareerBoardsTab.tsx` | 112 | 1 (self) |
| `admin/discovery/components/CrawlerRunsTab.tsx` | 121 | 1 (self) |
| `admin/discovery/components/OpportunityQueueTab.tsx` | 192 | 1 (self) |
| `admin/discovery/modals/DryRunModal.tsx` | 107 | 1 (self) — `DiscoveryWorkspace.tsx` has its own inline dry-run modal instead |
| `admin/discovery/modals/JobPreviewModal.tsx` | 4 | 1 (self) — a bare re-export shim of `PayloadModal` with no importers. **Violates the repo's own shim rule in `apps/web/AGENTS.md`** |
| `admin/discovery/constants.ts` | 27 | 1 per symbol — `BOARD_SET`/`COMPANY_PROVIDER_SET`/`INGESTION_URL` all zero importers |
| `admin/opportunities/opportunityFormSchema.ts` | 162 | 3, all self-referential (`:20,159,162`) — **a 162-line Zod schema nothing imports** |
| `features/navigation/AdminBottomNav.tsx` | 109 | 15 textual hits, **all in comments or its own definition**; zero import statements. `(admin)/layout.tsx:16-21` comments discuss it as if wired; it is not |
| `admin/ui/InlineEditableField.tsx` | 5 | **0** — comment-only file, no exports, no references |

`admin/components/AdminSkeletons.tsx` (194 lines) is imported for 2 of its 5
exports; `AdminOverviewSkeleton:51`, `AdminOpportunitiesSkeleton:135`,
`AdminFormSkeleton:176` each have 1 occurrence (self) — **3 dead exports,
~100 lines.**

### Dead exports inside live files

- `listUtils.ts` — `formatLinkHealth:29`, `linkHealthClass:34`,
  `formatLastVerified:41`, `getStatusBadgeClass:72` — 1 occurrence each (self)
- `statuses.tsx` (opportunities) — `OPPORTUNITY_QUICK_STATUS_OPTIONS:32` — 1 occurrence
- `admin-sidebar-data.ts` — `mainNavItems:203` — 2 occurrences, both the
  definition and the re-export in `AdminSidebar.tsx:33`; no consumer
- `AdminSidebar.tsx:31-36` re-exports `discoveryNavItems`/`mainNavItems`/
  `overviewCommandItems`/`settingsNavItems` — but `AdminCommandMenu.tsx:17-21`
  imports 3 of them **directly from `admin-sidebar-data`**, not the re-export.
  **The whole `export { … } from` block is dead.**
- `useAdminOpportunityActions.ts:18-24,171-177,216` — `lastBulkResult` is set and
  returned; `OpportunitiesClient.tsx:55-68` destructures 14 fields from the hook
  **and not `lastBulkResult`**. Never read.
- `OverviewTab.tsx:80` — `const { isAuthenticated, isAuthenticating } =
  useFirebaseAdmin();` with `// eslint-disable-next-line
  @typescript-eslint/no-unused-vars` at `:79`. `isAuthenticating` is dead;
  `isAuthenticated` is used at `:224,241,266,269`.
- Trailing blank-line runs from deleted code: `AlertsClient.tsx:210-215`,
  `PasskeyManager.tsx:171-176`
- `admin/page.tsx:9-14` — 5 blank lines after the redirect

### One more

`app/dev/grid-test/page.tsx` mounts `DataGrid` with 1000 mock rows and **is
reachable in production** — the proxy's localhost carve-out at `src/proxy.ts:116`
only covers `/captions` and `/discovery`, not `/dev`. It is a dev playground with
no role check.
