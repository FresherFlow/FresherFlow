# Duplication audit — `apps/web`

Read-only inventory of code that exists more than once in the web app, so we can
plan what to consolidate and what to leave alone.

**Scope:** `apps/web/src` and the workspace packages it imports
(`packages/utils`, `packages/ui`, `packages/types`, `packages/frontend-core`).
Nothing else. No mobile, no API, no scripts.

**How to read this.** Findings are grouped by *risk*. A finding is a
**correctness risk** when two copies of the same rule disagree at runtime and
the disagreement reaches the user. Everything else is **untidy** — real
duplication, no current user impact. **Dead code** is listed separately with its
line count.

**Confidence.** Every finding came from a read-only pass that read the source and
verified importer counts by grepping all of `apps/web/src`. Line numbers are from
the current dirty worktree. No file was modified for this audit.

---

## TL;DR

| Tier | Count | Meaning |
|---|---:|---|
| Live correctness risk | 16 | Two copies disagree; a user sees a wrong result today |
| Drift waiting to happen | 11 | Two copies agree today by luck, nothing enforces it |
| Dead code | ~1,700 lines | Zero importers, verified by grep |
| Untidiness | 30+ | Real duplication, no user impact |

Headline: the detail view, the job card, and the filter bar each have a
parallel implementation that is wired, plus a second one that is dead. The
detail view's dead copy is *also* the correct one in two places — it is the only
version that can mark a job Selected and the only version that remaps legacy
tracker values.

---

# Tier 1 — Live correctness risk

## 1.1 Two `getTrackerOptions`: the wired one cannot mark a job Selected

- **Live:** `features/jobs/domain/opportunityDetailHelpers.ts:53-63` —
  non-walk-in → `[APPLIED, INTERVIEWED]`; walk-in → `[PLANNED, ATTENDED]`
- **Dead:** `features/jobs/utils/detailInteractionUtils.ts:12-19` — non-walk-in →
  `[APPLIED, PLANNED, INTERVIEWED, SELECTED]`; walk-in →
  `[PLANNED, INTERVIEWED("Attended"), SELECTED]`

`ActionType.SELECTED` exists (`packages/types/src/enums.ts:200`) and
`handleSetAction` accepts any `ActionType` (`useOpportunityDetail.ts:280`). All
three tracker renderers iterate `ds.trackerOptions` and nothing else
(`OpportunityDetailClient.tsx:384`, `OpportunityDetailPane.tsx:298`,
`DetailSidebarActions.tsx:317`, `GovernmentJobDetailView.tsx:848`).

**Consequence: no surface can mark a job Planned or Selected except walk-in
Planned.** The four-stage version exists, in the dead file.

## 1.2 Live `getCurrentActionType` omits the legacy remap

`opportunityDetailHelpers.ts:49-51` returns `actions[0].actionType` raw.
`detailInteractionUtils.ts:4-10` and `packages/utils/src/opportunity/display.ts:320`
both remap `PLANNING→PLANNED` and `ATTENDED→INTERVIEWED` — and those legacy
values still exist in the enum (`packages/types/src/enums.ts:207-208`).

A tracker item written with a legacy value matches no offered `option.key`, so
no chip highlights. The remap that fixes it is in the dead file.

## 1.3 `getTrackerOptions` returns a different enum for the same label

`opportunityDetailHelpers.ts:56-57` returns `ActionType.ATTENDED` for the
walk-in "Attended" stage. Both other copies return `ActionType.INTERVIEWED`
with the label `'Attended'` (`detailInteractionUtils.ts:16`,
`packages/utils/.../display.ts:334`). Same UI, different stored value, so the
two disagree on read-back.

## 1.4 `getListingState` — two contracts, one of them lowercase

- Live: `domain/timeline.ts:7-12` → `'INACTIVE' | 'CLOSING_SOON' | 'ACTIVE' | 'EXPIRED'`
- Dead: `domain/opportunityDetailHelpers.ts:30-34` → `'inactive' | 'closing-soon' | 'active' | 'expired'`
- Package: `packages/utils/src/opportunity/display.ts:153` → raw `opportunity.status`, plus `linkHealth === 'BROKEN'`

Every consumer compares against UPPER_SNAKE
(`OpportunityDetailClient.tsx:575`, `OpportunityDetailPane.tsx:243,247,251`,
`DetailHeroSection.tsx:87,91,95`, `GovernmentJobDetailView.tsx:728,890,1182,1186`).
Swapping in the dead variant would render the literal lowercase string through
the `DetailHeroSection.tsx:103` fallback. Three contracts for one concept.

## 1.5 `sortTimelineEvents` — live version dropped the NaN filter

`domain/opportunityDetailHelpers.ts:7-12` filters out events with an unparseable
date. `domain/timeline.ts:23-27` — the live one, reached through the
`detailUtils.ts:2` barrel — does not. The live version can therefore emit an
event with `_dt: Invalid Date`.

## 1.6 `formatLpaValue` — dead version double-suffixes

`domain/timeline.ts:29-31` (live) and `packages/utils/.../display.ts:286` guard
with `/\bLPA\b/i`, so the suffix is idempotent.
`domain/opportunityDetailHelpers.ts:103-105` appends `" LPA"` unconditionally —
`"9.09-9.30 LPA"` becomes `"9.09-9.30 LPA LPA"`.

## 1.7 `formatDeadline` — signature and fallback both diverge

- `domain/timeline.ts:14-21` — takes `Opportunity`, returns `string | null`
- `domain/opportunityDetailHelpers.ts:23-28` — takes a raw value, returns `'No deadline'`
- `packages/utils/.../display.ts:161` — takes `Opportunity`, returns `null`

Callers already defend against both (`OpportunityDetailPane.tsx:286` uses
`deadline || 'Not set'`, `DetailHeroSection.tsx:184` uses `|| '—'`).

## 1.8 `buildEligibilitySnapshot` — three definitions, two return shapes

- `domain/eligibility.ts:22-93` — `{statusLabel, statusTone, mustFix, matchedSkills, missingSkills}`, takes a `profile`; live
- `domain/opportunityDetailHelpers.ts:36-43` — `{years, degrees, courses, skills}`, no profile; **imported live** at `hooks/useOpportunityDerivedState.ts:6`
- `packages/utils/src/opportunity/display.ts:181-252` — near-identical to the first, differing only in one regex: `eligibility.ts:107` uses `/[^a-z0-9]/g`, `display.ts:315` uses `/[^a-z0-9]+/g`

So `useOpportunityDerivedState` consumes the no-profile variant while
`DetailRequirements.tsx:7-11` types against the other shape.

## 1.9 `getEducationDetails` returns incompatible shapes

- `domain/eligibility.ts:11-20` → `{level, courses, specializations}` (mapped display strings, courses joined and deduped)
- `domain/opportunityDetailHelpers.ts:45-47` → raw `{degrees, courses, specializations}`

`DetailRequirements.tsx:7-11` types against `level`, so the raw variant cannot
satisfy it.

## 1.10 `getRelatedOpportunities` — two scoring algorithms

- `domain/directory.ts:3-32` (live, via barrel `utils/detailUtils.ts:3`) — company +5, location +3, skill +4 each capped at 4, workMode +1; filters expired and non-published; slices 6
- `domain/opportunityDetailHelpers.ts:87-101` — company +3, skill +1 each, **no expiry filter**, **no score>0 filter**; slices 3
- `packages/utils/.../display.ts:254` — matches `directory.ts` minus the government-parity filter

## 1.11 `filterOpportunities.ts` — pass 1 and pass 2 disagree on skills

Same file, two passes, opposite semantics on the same dimension:

| Predicate | Pass 1 | Pass 2 |
|---|---|---|
| skills | `skills.some(...)` = **ANY** (`:218-220`) | `skills.every(...)` = **ALL** (`:371-378`) |
| skills field source | `opp.skills \|\| opp.requiredSkills` (`:219`) | `opp.requiredSkills` only (`:373`) |
| roles | `opp.roles` (`:222-228`) | `opp.roles`, renamed local (`:379-392`) — duplicated body, same ANY semantics |
| work mode | full remote/hybrid/on-site (`:99-136`) | same logic again (`:320-370`), **no `type === 'REMOTE'` branch** |

`useCategoryPageState` and `useOpportunitiesFeed` chain both passes, so the two
answers AND together: selecting two skills passes pass 1 and is then killed by
pass 2.

The file's own header comment (`:20-24`) says "One home for feed filtering…
Never duplicate this logic at a callsite."

## 1.12 `saved` short-circuits every other filter

`filterOpportunities.ts:303` — `if (saved) return true;` inside pass 2. That
skips expiry, government-phase, work mode, skills, roles, drive date and drive
radius. Pass 1 only checks the saved map (`:71-73`). So a saved-only view
silently ignores the walk-in date and radius filters the user also selected.

## 1.13 Three salary formatters, three separators

| Function | Site | Output for the same value |
|---|---|---|
| `formatSalary` | `lib/utils/format.ts:3-10` | `₹3.5L - 4.5L` |
| `formatSalaryRange` | `packages/utils/src/opportunity/display.ts:9-18` | `₹3.5L - ₹4.5L` |
| `formatSalaryBadge` | `features/jobs/utils/walkinMapUtils.ts:522-528` | `₹3.5-4.5L` |
| `getOpportunityDisplaySalary` | `features/jobs/domain/display/salary.ts:102-169` | `6-8 LPA` |
| `formatSalaryRange` | `features/admin/opportunities/opportunityPayload.ts:171` | admin-only variant |

Related: `formatExperience` (`lib/utils/format.ts:12-17`) has no `max >= 50` case
and emits `"5-99 years"`, where `packages/utils/.../display.ts:29` returns
`"50+ years"`.

## 1.14 `getCompanySlug` — three implementations, different arguments

| Site | Signature | Behaviour |
|---|---|---|
| `packages/utils/src/slugify.ts:96-175` | `(name, url)` | handles ATS subdomains (`lever`, `greenhouse`, `workday`), double TLDs, generic-subdomain list |
| `features/jobs/domain/display/skills.ts:32-47` | `(companyWebsite, companyName)` | **arguments reversed**; strips `careers\|jobs\|talent\|work\|apply\|hr`; takes `parts[len-2]` |
| `features/companies/utils/companySlugger.ts:37-52` | — | Clearbit URL parsing, no shared rules |

For `https://boards.greenhouse.io/zohocommunity` the second returns
`greenhouse`. `features/companies/utils/companySlugger.ts` is the one the
company pages use.

## 1.15 `toSafeOutboundUrl` — a private copy with a different failure mode

`lib/utils/safeOutboundUrl.ts:17-34` is the canonical version. A second copy sits
at `features/landing/LatestJobsList.tsx:16-25`, and the canonical file's own doc
comment (`:10-11`) names it as a known duplicate. The copy resolves scheme-less
URLs against `https://fresherflow.in` — same-origin resolution, where the
canonical version forces `https:`. A scheme-less `applyLink` therefore becomes a
*fresherflow.in* link on the landing page and a rejected link everywhere else.

## 1.16 `buildShareUrl` and `buildLoginFromDetailHref` — different targets

- `lib/utils/share.ts:26-52` rewrites protocol and host to
  `NEXT_PUBLIC_SHARE_BASE_URL` and applies a `PLATFORM_MEDIUM` map (`:13`).
  `packages/utils/src/opportunity/display.ts:339` does neither.
- `domain/opportunityDetailHelpers.ts:65-71` builds
  `/app?redirect=<raw href>&source=&ref=` — **no `encodeURIComponent`**, and a
  different route and param name than `packages/utils/src/opportunity/routing.ts:3-7`
  and `detailInteractionUtils.ts:21-25`, which are character-identical to each
  other and build `/signup?redirect=<encoded>&source=…`.

The unencoded `redirect` is reachable from a share link containing `&`.

---

# Tier 2 — Drift waiting to happen

Two copies agree today by luck. Nothing enforces it.

## 2.1 `JobCard` / `JobCardMobile` — ~90 duplicated logic lines, already drifted

The presentational layer is properly shared (`JobCardBadges`, `JobCardMetaConfig`,
`jobCardUtils`). The behaviour layer is duplicated line for line:

| Logic | `JobCard.tsx` | `JobCardMobile.tsx` |
|---|---|---|
| `useRouter` / `useAuth` / `useFirebaseSaved` / `useTrackerWriter` | `:91-97` | `:57-62` |
| `isDrive` / `isGovernment` / `isWalkin` | `:99-101` | `:64-66` |
| `targetId` + saved-map fallback | `:103-104` | `:68-69` |
| tracker-status lookup over 6 action types | `:106-110` | `:71-75` |
| `locationInfo` with `PAN India` short-circuit | `:136-138` | `:82-84` |
| `driveDetails` → `walkinDestination` → `directionsUrl` | `:151-158` | `:95-104` |
| `handleSaveClick` (login toast, cache write, `toggleSavedJob`, toasts) | `:169-183` | `:106-120` |
| `handleApplyClick` (`PLANNED` for walk-in, cache, `writeTrackerItem`, `window.open`) | `:185-200` | `:122-137` |
| `handleCardClick` + `closest('a, button, [role="menuitem"], input, select, textarea')` guard | `:202-206` | `:139-143` |
| expired opacity | `:220` | `:150` |

**Already diverged, one way.** `JobCard.tsx:93` reads `useSearchParams()` and
`:112-120` falls back to `q` / `search` / `skill` / `query` for skill reordering.
`JobCardMobile.tsx:79` uses only the `searchQuery` prop, and
`JobCardResponsive.tsx:84-86` forwards only `searchQuery` (`:76-86` vs `:91-108`
for the desktop branch). **A URL-driven skill search reorders skills on desktop
and not on mobile.**

Also not forwarded to mobile: `variant`, `isAdmin`, `isSelected`, `isHovered`,
`onMouseEnter`, `onMouseLeave`. So the admin edit button
(`JobCard.tsx:376-391`) and split-view selection styling (`:216-219`) never
appear below the `lg` breakpoint.

**Keep both DOM trees.** `JobCardResponsive.tsx:30-43` documents why: rendering
both cards doubles the `AutoFitBadges` measurement strips, the two
`ResizeObserver`s, and the saved/tracker subscriptions. Desktop renders
`<AutoFitBadges maxRows={1}>` (`:304-309`); mobile renders
`<JobCardBadges compact />` with a hard cap of two skills (`:86-91, :201`).
Consolidate the logic, not the DOM.

## 2.2 Mobile card omits six desktop features

Same job, mobile shows less: type label (`:161,242,268`), the `buildMetaItems`
strip (`:160,304-309`), `useCommentCount` + Discuss CTA (`:163-167,311-331`),
`JobCardMenu` — share, copy summary, copy link, add-to-calendar
(`:296`, `JobCardMenu.tsx:45-102`), `WalkinDateChip` (`:244,270`), and
`isFreshlyPosted` highlight (`:249,278`). `buildShareUrl` (`:140-149`) is desktop
only. `id="job-card-${targetId}"` (`:210`) is desktop only, so nothing can
anchor to a mobile card.

One visible-text divergence: "Applied" is a bordered green pill on desktop
(`:332-337`) and is inlined into the meta sentence on mobile (`:174-182`).

## 2.3 `SavedJobCard` is a fourth hand-rolled card

`features/jobs/components/SavedJobCard.tsx` (141 lines) is used by `SavedTab.tsx:231`
and `CompanyRoleCard.tsx:24`. It diverges from `JobCard`:

- its own `timeAgo` (`:12-21`, `:68`) — `3d ago` — not `getPostedLabel`'s
  `3 days ago` (`jobCardUtils.ts:165`)
- no tracker write, no `saveOpportunityToCache`, no login gate; Apply is a bare
  `<a>` (`:130-136`) that uses the raw `applyLink` with no URL sanitisation when
  `applyHref` is omitted (`:63-66`)
- `isSaved` is hard-coded `true` by the caller (`SavedTab.tsx:234`)

## 2.4 `OpportunityRow` silently drops tracker actions

`components/OpportunityRow.tsx` has no hooks (justified —
`CategoryPageView.tsx:939-954`). It duplicates only derived values: `getModeLabel`
(`:23-32`), `getTypePrefix` (`:34-38`), a `getPostedLabel` call (`:51`), a bare
bookmark button (`:104-119`). But it never reads `job.actions` — Applied comes
only from the `isApplied` prop (`:101`), so an `APPLIED` action in the payload
is invisible in the split sidebar. It also never reads `normalizedRole`
(`JobCard.tsx:257` does), and has no expiry opacity, no skills, no Apply.

## 2.5 Four hand-rolled filter dimensions with no SET control

Persisted or URL-read, but unreachable:

| Dimension | Read/written | SET control |
|---|---|---|
| `role` | `useCategoryPageState.ts:247,433,580`; counted `:476,955` | **none.** `JobsFilterBar` declares it (`:39`) and never renders it; the drawer never receives `draftRole`; the chip row (`:613-730`) omits it. A `?role=` URL renders results with no chip and no control. |
| `closingSoon` | written `:536`, chip at `CategoryPageView.tsx:710` | **none.** The drawer receives `draftClosingSoon` (`:52-53,154`) and only counts it (`:218`). |
| `saved` | written `:539`, chip at `CategoryPageView.tsx:717` | **none.** Same pattern (`:54-55,155,219`). |
| `govtCategory` | `?category=` read `:226`, chip `CategoryPageView.tsx:616` | **none.** `GovtCategoryFilter` (`GovtPhaseTabs.tsx:129`) is exported with **zero importers**; `categoryCounts` is computed (`useCategoryPageState.ts:716-725`) and returned (`:1036`) but never destructured. |

`experience` is the reverse asymmetry: set only in the drawer
(`MobileFilterDrawer.tsx:288-311`) on the `CategoryPageView` route, while
`JobFilterBar` renders a Fresher-only pill (`:581-602`).
`driveRadiusKm` is unreachable from `JobFilterBar` (the panel is deleted there)
but reachable from `JobsFilterBar.tsx:417` and the drawer `:419`.

## 2.6 `FilterDropdownBar` is a 921-line dead clone of `JobFilterBar`

`components/FilterDropdownBar.tsx` (1087 lines) has **zero importers**. It is
921 lines identical to `JobFilterBar.tsx` (1200 lines), similarity 0.81 — and
the two already disagree:

| Behaviour | `JobFilterBar` (live) | `FilterDropdownBar` (dead) |
|---|---|---|
| portal machinery | yes (`:155-245`) | no — dropdowns render inline |
| drive-radius panel | deleted | present (`:715-757`) |
| drive-date buckets | **3, missing `next30Days`** (`:818-822`) | 4 (`:683-688`) |
| wide-feed hidden count | counts **all** dims (`:306-309`) — over-counts | counts only hidden (`:215-218`) |
| `PanelClearButton` | present (`:120-132`) on 11 panels | absent |
| Fresher / experience pill | present (`:581-602`) | absent |
| keyboard `activeIndex` seed | `-1` (`:400-402`) | `0` (`:492-494`) |

Two more dead filter files: `components/OpportunityFilters.tsx` (141 lines,
0 importers) and `components/DirectoryView.tsx` (156 lines, 0 importers, and it
exports a deprecated alias at `:174`).

## 2.7 `feedKinds.ts` exists but the bars ignore it

`utils/feedKinds.ts` (146 lines) already centralises `FeedKind` (`:23`), a
15-member `FilterDimension` union (`:26-42`), per-feed `TYPE_OPTIONS` (`:45-61`),
per-feed `DIMENSIONS` (`:70-109`), `toFeedKind` / `getFeedKind` (`:117,125`),
`getTypeOptions` (`:129`), `supportsDimension` (`:138`), `isGovtFeed` /
`isWalkinFeed` (`:145-146`).

What is still hand-rolled in all four bars:

- Every bar branches on `isGovt` / `!isGovt`
  (`FilterDropdownBar:179,277,514,602,760`, `JobFilterBar:270,368,729,848`,
  `JobsFilterBar:121,297,509,530`, `MobileFilterDrawer:351,393`) instead of
  testing a dimension. So `DIMENSIONS.JOB` (`:78-79`) includes `qualification`
  and `sector`, but no bar renders them on a job feed.
- `skills`, `course`, `source`, `year`, `company`, `role` are gated by `isGovt`
  rather than `supportsDimension`, so the `WALKIN` list (`:85-97`, which omits
  `course`) governs nothing.
- Type labels are re-derived by hand in each bar
  (`FilterDropdownBar:456`, `JobFilterBar:549`, `JobsFilterBar:341`) even
  though the registry already returns a `label`.
- `supportsDimension` is only ever called with `'driveDate'` and `'driveRadius'`
  — the 13 other dimensions in the union are never passed to it.
- Dead exports: `getFilterDimensions` (`:133`) has zero callers;
  `isWalkinFeed` is computed and discarded in `JobsFilterBar.tsx:122`.

## 2.8 `getDriveMetadata` prints two different CTCs for the same job

Hard-coded data keyed off two title substrings:

| | `domain/driveTimeline.ts:65-106` | `packages/utils/src/driveTimeline.ts:55-91` |
|---|---|---|
| TCS trigger | title `nqt` **and** company `tata` (`:68`) | title `nqt` **and** company `tata` **or `tcs`** (`:70`) |
| max CTC | `'Up to 12.26 LPA'` (`:74`) | `'7-12 LPA'` (`:73`) |
| salary rows | 4 | 2 |
| badges | `['Hiring Drive','Campus 2024-2026','0-2 Yrs','Prime + Digital']` | `['Mass Hiring','Global Drive']` |
| steps | `['NQT Test','Shorting','Interview','Offer']` | `['Online Test','Technical Interview','HR Interview']` |

Also: `isCampusDriveOpportunity` (`packages/utils/.../driveTimeline.ts:25`)
matches `off campus`; the web copy (`domain/driveTimeline.ts:53`) does not.
`getDriveDates` — web `pickEarliestEventDate` (`:33`) sorts and takes the
earliest of duplicate dates; the package `findDate` (`:40`) takes `.find()`, the
first. **`Campus 2024-2026` is a hard-coded badge with no data behind it.**

## 2.9 `getPostedLabel` — two forms, and the dead `timeAgo` set is worse

- `JobCard/jobCardUtils.ts:159-166` (takes `Opportunity`) → `Today`, `1 day ago`
- `OpportunityDetailPane.tsx:55-68` (takes a date) → `Today (05 Mar 2026)`, `Yesterday (05 Mar 2026)`

Six `timeAgo` implementations, five output vocabularies:

| Site | Input | Output shape |
|---|---|---|
| `features/notifications/notificationItems.ts:247` | `number` (ms) | min→h→day, `>7d` → locale date. **The only shared one** — used by `NotificationsDropdown.tsx:18` and `NotificationsTab.tsx:23` |
| `features/jobs/tabs/SavedTab.tsx:21` | `string \| Date` | `today` / `1d ago` / `Nd ago` / `Nmo ago` — **dead, no call site** |
| `features/jobs/components/SavedJobCard.tsx:12` | `string \| Date` | byte-for-byte identical to the dead `SavedTab` copy |
| `features/jobs/components/CompanyHubIntel.tsx:15` | `string` | `today` / `yesterday` / `Nd ago` — no months |
| `features/community/components/ReferralBoardClient.tsx:19` | `string` | min→h→day, no date fallback |
| `features/landing/LatestJobsList.tsx:41` | `string` | uppercase `3M AGO` / `5H AGO` / `YDA` / `4D AGO` |

Two more label divergences on the same card layer: work mode
`JobCardMetaConfig.ts:38` → `Onsite` vs `OpportunityRow.tsx:23` → `On-site`;
job type `jobCardUtils.ts:229` → `Intern` vs `OpportunityRow.tsx:34` →
`Internship`. Freshness threshold `jobCardUtils.ts:168` → `days <= 1` vs
`LatestJobsList.tsx:27` → `days <= 2`.

## 2.10 `OpportunityDetailClient` vs `OpportunityDetailPane`

`detail/OpportunityDetailClient.tsx` (623) and `OpportunityDetailPane.tsx` (415)
are both live, mounted by different routes.

**Byte-identical blocks** (verified by exact string compare):
`GovernmentJobDetailView`'s 15-line prop block (`:210-224` vs `:217-231`),
`ExpiredWarning` (`:331` vs `:234`), `ComplexityCard` (`:353-355` vs `:340-342`),
`WalkInDetailsCard` (`:357-359` vs `:344-346`), `DetailCampusDriveInfo`
(`:362-367` vs `:353-358`), `DetailTimeline` (`:369-372` vs `:360-363`),
`DescriptionSection` (`:374-377` vs `:335-338`).

**Sections only the client has:** `DetailHeroSection` (`:313-329`) — the pane
hand-rolls a competing badge/fact block at `:237-291` instead;
`DetailSidebarActions` (`:426-444`), the whole desktop sticky rail;
`DidYouApplyCard` (`:338-344`); the mobile requirements block (`:349-350`);
`ComplexityCard` for `ASSESSMENT` (`:414-416`); the `AuthModal` guest-save flow
(`:80-89,108-116,608-620`); the mobile scroll-reactive header (`:245-283`);
breadcrumbs (`:295-307`); directory link nav (`:465-561`); a real 404-vs-error
split (`:136-200`, the pane collapses both at `:105-120`).

**Sections only the pane has:** a header Save button (`:155-172`) — the client
has **no save control below `lg`**, since the sidebar is `hidden lg:block`
(`:424`) and the mobile bar (`:568-604`) offers only Apply and Share;
`CopyButton` (`:184-190`); "Open full page" (`:192-201`); close-panel
(`:202-210`); `WalkinTrustStrip` (`:348-350`); side-by-side deadline and posted
rows (`:278-290`). It also imports `getFeedBadgeLabel`, `isGovernmentOpportunity`
and `isNotEligible` (`:44-45`) and never uses them.

The client wins: it is what `/jobs/[slug]` and `/govt/[slug]` mount, and
`loading.tsx` mirrors its geometry.

## 2.11 `GovernmentJobDetailView` receives a save handler it never destructures

`handleToggleSave` is declared at `:46` and passed by both callers
(`OpportunityDetailClient.tsx:219`, `OpportunityDetailPane.tsx:226`), but the
destructuring block ends at `:296` without it. There is zero `isSaved` or
`Bookmark` in all 1872 lines. `formatDeadline` (`:50`) is likewise never
destructured. **Government jobs have no save button** — the only component that
had one, `GovernmentStickyActionBar.tsx:36-46`, is dead.

---

# Tier 3 — Untidiness

| Finding | Sites | Note |
|---|---|---|
| `useClickOutside` | canonical `hooks/useClickOutside.ts:3`, byte-identical `packages/frontend-core/src/hooks/useClickOutside.ts:3`, and 3 local re-definitions (`FilterDropdownBar:98`, `JobFilterBar:98`, `JobsFilterBar:85`) | `FilterDropdownBar` and `JobsFilterBar` copies are byte-identical; `JobFilterBar`'s passes the event through for portal containment (`:220-222`) |
| `useDebounce` | byte-identical in `hooks/useDebounce.ts:5` and `packages/frontend-core/src/hooks/useDebounce.ts:5` | plus a **callback**-flavoured `useDebounce` at `app/(auth)/login/_components/LoginForm.tsx:35` — same name, different semantics |
| `useIsMobile` | `hooks/useIsMobile.ts:16` uses 1024 + `mql`; `hooks/use-mobile.tsx:5` uses 768 + `innerWidth` | both live, in the same app. `useIsMobile.ts:6-13` documents the bug. The 768 copy has 2 importers, **both dev-only** |
| Aggregates memos | `FilterDropdownBar:220-262`, `JobFilterBar:311-353` (identical bodies), renamed in `JobsFilterBar:172-225`, **non-memoised** in `MobileFilterDrawer:222-244` | 8 memos: locations, skills, sources, years, companies |
| Keyboard-nav effect | `FilterDropdownBar:405-432` and `JobFilterBar:497-524` identical; `JobsFilterBar:147-157`; reduced Escape-only at `MobileFilterDrawer:195-204` | |
| `xl` breakpoint `useMemo` | `FilterDropdownBar:128`, `JobFilterBar:147`, `JobsFilterBar:128` | `hooks/useMediaQuery.ts:18` already exists and is not used |
| `clearAll` / `applyMobileFilters` / `openMobileFilters` | `useCategoryPageState.ts:863-933` vs `OpportunitiesFeedClient.tsx:261-293` | the client copy drops workMode, skills, driveDate, driveRadius |
| `mobileActiveCount` | `useCategoryPageState.ts:464-477` vs `OpportunitiesFeedClient.tsx:161-171` | different term sets |
| `GOVT_SECTORS` | `FilterDropdownBar:37`, `JobFilterBar:44`, `JobsFilterBar:71`, `MobileFilterDrawer:35` — 4 identical copies | diverges from the canonical `GOVT_CATEGORIES` (`GovtPhaseTabs.tsx:94-105`), which has 11 labels including `State PSC`, `Engineering`, `Nursing`, and spells `Defence` vs `Defense` |
| `GOVT_QUALIFICATIONS`, `CORP_COURSES` | 4 identical copies each | |
| `ROLE_OPTIONS` | `FilterDropdownBar:41-54`, `JobFilterBar:48-61` — identical; unrelated 3rd copy at `app/(admin)/admin/users/_components/UsersTable.tsx:39` | |
| Drive-date buckets | 4 sites; `JobFilterBar:818-822` is **missing `next30Days`** | labels differ: `All Dates` vs `Any date` |
| `WORK_MODE_LABELS` | `useProfileFilters.ts:44-49` and `Saved/SearchesTab.tsx:45-50` — identical | plus an enum variant `['ONSITE','HYBRID','REMOTE']` at `features/profile/profileConstants.ts:33` — `ON_SITE` vs `ONSITE` |
| `DropdownOption` union | `FilterDropdownBar:83-96` and `JobFilterBar:83-96` — declared twice, identically, 14 arms | `JobsFilterBar` has none; `MobileFilterDrawer` has a different `OpenSection` union (`:41`) with different member names |
| `FilterBarFilters` | `FilterDropdownBar:21-35` and `JobFilterBar:20-35` (adds `experience` at `:33`); `JobsFilterBarFilters` at `JobsFilterBar:27-41` | all three declare `driveDate?` and **none of them read it** — the live value travels as a separate prop (`:63`, `:70`, `:55`) |
| `FeedFilterCriteria` / `LocalFilterInput` / `ProfileVisibilityInput` | `filterOpportunities.ts:26-45`, `:280-296`, `:262-266` | plus a hand-built criteria object in `useCategoryPageState.ts:941-960` |
| Experience buckets | `filterOpportunities.ts:233-251` hardcodes 6 strings; only `Fresher` has a constant (`JobFilterBar.tsx:42`) | 5 of 6 have no UI constant anywhere |
| `parseOpportunityLocation` | `features/jobs/domain/display/location.ts:38-117` (live, 12 call sites) vs `packages/utils/src/opportunity/display.ts:100-128` | web does country/state resolution, a remote-alias set, and an `isRemote` flag; the package returns `fullLabel:'Remote / Work from Home'`. `getGroupedLocations` (`:119-170`) then re-declares `toTitleCaseLocal` (`:127`) and `REMOTE_ALIASES_LOCAL` (`:136`) inside the module that already has both (`:22`, `:4`) — and the local title-caser lowercases the rest of each word, the module one does not |
| Three location vocabularies | `utils/locationUtils.ts:1,32` (`VALID_LOCATIONS`, aliases `delhi/noida/gurugram/ncr/gurgaon` → `delhi-ncr`) · `domain/display/location.ts:4,74` (5-entry remote set) · `packages/utils/src/domains.ts` (`isStateName` / `getStateForCity`) | no shared list |
| Cluster tables | `walkinMapUtils.ts:207` `CLUSTER_COORDS_BY_CITY` and `:334` `CITY_FALLBACK_COORDS` | different data sets, both live. The map `dest` template is repeated 3× at `:612`, `:964`, `:1002` |
| `WalkinCalendar` | `features/jobs/components/WalkinCalendar.tsx` (266) and `app/(public)/drives/walk-in/WalkinCalendar.tsx` (267) | both dead, both re-declare `bucketForDate` and `BUCKET_STYLES` locally (`:56,69` / `:57,70`) while `utils/walkinEventUtils.ts:24,124` exports both |
| Web DTOs shadowing `packages/types` | `CompanyMetadata` at `lib/api/cdnFeed.ts:758` and `features/companies/types.ts:26` (identical to each other, both differ from the package: `logo_url` vs `logoUrl`) · `ParsedJob` at `features/admin/opportunities/formUtils.ts:107` · `DriveDetailsLike` at `:30` and a third `DriveDetails` at `walkinMapUtils.ts:32` · `AppFeedbackHistoryItem` at `lib/api/client.ts:81` · `SharePlatform` at `lib/utils/share.ts:3` | `ListingState`, `TimelineEventView`, `EligibilitySnapshot` in `domain/timeline.ts:3,5` and `eligibility.ts:3` are structurally identical to the package — harmless mirrors |
| **5 HTTP transports in `lib/api`** | `core.ts:381` browser client (retry, backoff, 401 refresh, Sentry) · `server-client.ts:42` RSC client with a **duplicate `normalizeApiBase`** (`:5` vs `core.ts:227`, character-identical) · `cdnFeed.ts` (845 lines, 21 `fetch` calls to signed CDN URLs with an `api.fresherflow.in` fallback) · 4 bare same-origin `fetch('/api/…')` calls at `client.ts:38,51,69` and `auth.ts:31` · `@fresherflow/api-client` wired in at `core.ts:36-59` with its own storage adapter | transports 1 and 5 run in the same page with **two token stores** — `apiClient` writes `ff_auth_token_v1` (`core.ts:186`) for the package client to read (`:27`) |
| `packages/ui` primitives unused | web imports the package for `utils/cn` (48 sites), `utils/sanitize` (1), `utils/error-web` (1), `components/Timeline` (1), `components/Tabs` (1) — **none of the 9 barrel components** | `Button`, `Card`, `Badge`, `Input`, `CompanyLogo`, `theme`, `DataTable`, and `components/toast/*` have zero importers monorepo-wide |
| …but hand-rolled where primitives exist | `Card` → `features/dashboard/components/DashboardCard.tsx:17` and `ProfileSectionCard.tsx` · `Badge` → `AutoFitBadges.tsx`, `SkillPill.tsx`, `JobCardBadges.tsx:9,16` (three chip systems) · `Button` → `admin/discovery/components/DiscoveryHeader.tsx`, `community/components/HelpfulButton.tsx` · `CompanyLogo` → `features/companies/components/CompanyLogo.tsx` | |
| `StatCard` written three times | `apps/web/src/ui/StatCard.tsx:19` already exists, and its comment (`:9-12`) says it was created because "four admin pages were doing exactly that" — yet `admin/discovery/components/DashboardTab.tsx:43` and `settings/tabs/ReferralTab.tsx:50` still have local copies | |
| 32 hand-rolled empty / zero-results states | Full list in the audit notes; 15 sites use `ui/EmptyState.tsx` correctly, 17 do not | `ProfileSectionCard.tsx:96` even exports a **second** empty-state primitive, `SectionEmptyState`, alongside `EmptyState` |

---

# Dead code — ~1,700 lines, zero importers

Verified by grepping all of `apps/web/src` for both the symbol name and the module
path. No file below has an importer.

| File | Lines | Note |
|---|---:|---|
| `features/jobs/components/FilterDropdownBar.tsx` | 1087 | 921 lines identical to the live `JobFilterBar` |
| `features/jobs/components/detail/GovernmentJobDetailView`'s dead neighbours | | see below |
| `detail/DetailActionHeader.tsx` | 99 | 4th header variant |
| `detail/DetailActionMobile.tsx` | 108 | 4th mobile action bar |
| `detail/GovernmentStickyActionBar.tsx` | 72 | 4th sticky bar — and the only one with a government save button (2.11) |
| `detail/EligibilitySnapshotCard.tsx` | 92 | consumes the `eligibilitySnapshot` that nothing renders |
| `detail/OpportunityDeadlineBadge.tsx` | 26 | the only component rendering "Closing soon · date" |
| `detail/MobileGuestCTA.tsx` | 24 | |
| `detail/QuickActionsMobile.tsx` | 22 | the only "Report issue" entry point under `detail/` |
| `utils/detailInteractionUtils.ts` | 39 | **the correct `getTrackerOptions` and `getCurrentActionType` live here** (1.1, 1.2) |
| `components/OpportunityFilters.tsx` | 141 | `minSalary` UI |
| `components/DirectoryView.tsx` | 156 | exports a deprecated alias at `:174` |
| `components/WalkinCalendar.tsx` | 266 | duplicate calendar |
| `app/(public)/drives/walk-in/WalkinCalendar.tsx` | 267 | duplicate calendar |
| `lib/utils/format.ts` | 27 | all 3 functions superseded |
| `features/jobs/components/GovtPhaseTabs.tsx` `GovtCategoryFilter` | — | exported at `:129`, never imported |
| `features/jobs/utils/feedKinds.ts` `getFilterDimensions` | — | `:133`, zero callers |
| `SavedTab.tsx` `timeAgo` | 10 | `:21`, no call site after `SavedJobCard` extraction |
| `jobCardUtils.ts` `getVisibleSkills`, `getEligibilityLine`, `getAccentBorderClass` | — | `:147`, `:204`, `:237` — exported, never imported |
| `JobCard.tsx` re-exports | — | `resolvePassoutYears`, `generateJobSummaryText`, `reorderSkillsBySearch`, `formatPassoutYears`, `formatEducationEligibility` — nothing imports these from `JobCard` |
| `JobCardBadges.tsx:43-47` | — | `compact ? … : …` — all three branches are byte-identical strings |
| `OpportunityDetailPane.tsx` imports | 3 | `getFeedBadgeLabel`, `isGovernmentOpportunity`, `isNotEligible` (`:44-45`) — imported, never used |
| `domain/timeline.ts` + `opportunityDetailHelpers.ts` `formatTimeText12Hour` | — | identical stubs, no call sites anywhere |

**Props threaded through the live path but never read:**

- `JobCard.tsx:57,79` `variant` — destructured, never referenced; threaded through
  `JobCardResponsive.tsx:20,56,100` and set by `OpportunityGrid.tsx:100` and
  `CategoryPageView.tsx:1001-1005`
- `JobCard.tsx:49` `job.matchScore` / `job.matchReason` — in the prop type, never
  read. `ForYouTab.tsx:166-170` renders them itself, above the card
- `DetailHeroSection` — ODC`:322-328` passes 7 props the component declares but
  never references: `isMobile` (`:35`), `isExpired` (`:33`), `isClosingSoon`
  (`:34`), `hasApplyLink` (`:36`), `handleApply` (`:37`), `handleShare` (`:38`),
  `handleCopyLink` (`:39`). Only `formatDeadline` is used (`:184`)
- `DetailSidebarActions` — `loginFromDetailHref` (`:48`), `handleCopyLink`
  (`:55`), `isMobile` (`:51`) all declared, none destructured. ODC`:437,443`
  passes the first two
- `GovernmentJobDetailView` — `handleToggleSave` (`:46`), `formatDeadline`
  (`:50`); see 2.11
- `OpportunityRow.tsx:51` — `opp as Opportunity` cast, `opp` is already typed
- `JobCard.tsx:88-89` `mountedRef` — assigned, never read

---

# What is already correct — do not "fix" these

- `features/jobs/utils/searchUtils.ts` — the only sanitiser and tokeniser in
  scope. `sanitizeSearchQuery` (`:20`) is text cleanup, not encoding;
  `packages/ui/src/utils/sanitize.ts:3` `escapeHtml` is the only encoder and has
  exactly one consumer (`detail/DescriptionSection.tsx:2`). **Do not merge these
  two — they do different jobs.**
- `components/OpportunitySkeletons.tsx` — 12 skeleton exports across 8 loading
  surfaces. This is the model the rest of the app should follow.
- `features/notifications/notificationItems.ts` — the only notification
  type→label map and the only shared `timeAgo`. Correctly single-homed.
- `GovernmentJobDetailView.tsx` (1872 lines) — imports **zero** components from
  `components/detail/`. Genuinely a different product surface; do not fold it in.
- `OpportunityRow.tsx` — zero hooks, justified at
  `CategoryPageView.tsx:939-954`. Do not give it hooks.
- `JobCard`'s separate desktop/mobile DOM trees — justified at
  `JobCardResponsive.tsx:30-43` (doubled `ResizeObserver` and
  saved/tracker subscriptions). Consolidate logic, not markup.
- `MapBottomDriveCard.tsx`, `CompanyRoleCard.tsx`, `LatestJobRow`,
  `ResourceCard` — each has a call-site comment stating why.
- The `xl`-breakpoint `useMemo` works today; consolidating it is tidy-up, not a
  bug fix.

---

# Suggested plan

**Phase 1 — correctness, no new abstractions (best value per line changed)**

1. Wire the 4-stage `getTrackerOptions` and the legacy remap from
   `getCurrentActionType` (1.1, 1.2, 1.3) — the correct code is already written,
   in a dead file.
2. One `matchesSkills` rule in `filterOpportunities.ts`; drop the duplicated
   role and work-mode predicates (1.11).
3. Make `saved` compose with the other filters instead of short-circuiting (1.12).
4. Delete the dead `eligibilitySnapshot` consumer and pick one
   `buildEligibilitySnapshot` shape (1.8, 1.9).
5. Restore the NaN-date filter in `sortTimelineEvents` (1.5) and the LPA guard
   (1.6).
6. Give `GovernmentJobDetailView` its save button back, or delete the prop (2.11).
7. `encodeURIComponent` the detail redirect (1.16).

**Phase 2 — delete dead code (~1,700 lines, no behaviour change)**

8. `FilterDropdownBar.tsx` · `OpportunityFilters.tsx` · `DirectoryView.tsx` ·
   both `WalkinCalendar` copies · `lib/utils/format.ts` · the 7 dead detail
   components — **after** Phase 1 harvests the two correct functions out of
   `detailInteractionUtils.ts`.

**Phase 3 — the card layer**

9. Extract the shared behaviour from `JobCard` / `JobCardMobile` into one hook.
   Keep both DOM trees. Forward `searchedSkill` to mobile (2.1).
10. Retire `SavedJobCard`'s private `timeAgo` and unsanitised `<a>` in favour of
    `getPostedLabel` and `toSafeOutboundUrl` (2.3, 1.15).
11. Decide whether `OpportunityRow` should read `job.actions` (2.4).

**Phase 4 — the detail layer**

12. Extract the byte-identical section stack out of `OpportunityDetailClient` /
    `OpportunityDetailPane`; keep the client's rail and hero (2.10).
13. Collapse the helper cluster onto `timeline.ts` + `eligibility.ts` +
    `directory.ts`; delete `opportunityDetailHelpers.ts` (1.4–1.10).
14. Strip the 13 unread props.

**Phase 5 — the filter layer**

15. Delete `FilterDropdownBar`; move the drive-radius panel and `next30Days`
    bucket that only it had back into the live bars (2.6).
16. Render dimensions from `feedKinds.DIMENSIONS` instead of `isGovt` branching;
    wire `getFilterDimensions` or delete it (2.7).
17. Give `role`, `closingSoon`, `saved`, `govtCategory` a control, or stop
    persisting them (2.5).
18. Move `GOVT_SECTORS`, `GOVT_QUALIFICATIONS`, `CORP_COURSES`, `ROLE_OPTIONS`,
    drive-date buckets, `WORK_MODE_LABELS`, and the aggregates memos into
    `feedKinds.ts`; delete the 3 local `useClickOutside` copies.
19. Route the 17 hand-rolled empty states through `ui/EmptyState.tsx`.

**Phase 6 — tidy**

20. `useIsMobile` → one breakpoint; drop the dev-only 768 copy.
21. Consolidate the 6 `timeAgo` implementations onto
    `notificationItems.ts:247`.
22. `server-client.ts:5` → import `normalizeApiBase` from `core.ts:227`.
23. Reconcile the 5 HTTP transports. Largest single win, zero user impact — do
    it last.
