# Audit 08 — Runtime and rendering performance

Read-only. Counts measured against the current worktree. No files edited.

---

## 1. Client component surface

| Metric | Value |
|---|---|
| Files under `apps/web/src` | 669 (473 `.tsx`) |
| Carrying `'use client'` | **310 (46% of source, 65% of `.tsx`)** |
| Of those, no interactivity at all | **42** — pure Server-Component candidates |

The 42 need no client directive. No hooks, no `on*` handler, no context, no
`next/dynamic`:

| Lines | File | Note |
|---|---|---|
| 177 | `ui/app-sidebar.tsx:1` | static nav markup |
| 177 | `app/(admin)/admin/audit/AuditColumns.tsx:1` | column defs |
| 143 | `features/landing/LatestJobsList.tsx:1` | `<a>`/`<img>` only |
| 97 | `features/platforms/components/PlatformCard.tsx:1` | only child is `CompanyLogo` |
| 94 | `features/dashboard/components/DashboardCard.tsx:1` | |
| 64 | `features/dashboard/components/DashboardSection.tsx:1` | |
| 39 | `features/jobs/components/discussion/ProvenanceStrip.tsx:1` | `formatDistanceToNow` + `<a>` |
| 36 | `ui/Skeleton.tsx:1` | pure `div` + `cn`, yet pulled into the client graph by every skeleton list |
| 23 | `features/shell/LogoImage.tsx:1` | imports `next/image` but renders a plain `<img>` (`:16`) |

(`app/(auth)/_components/AuthHeader.tsx` is a false positive — it does read
`useTheme()` at `:11`.)

Largest client components, all confirmed: `GovernmentJobDetailView.tsx` (1765),
`CaptionsTool.tsx` (1577), `AdminResourcesClient.tsx` (1274),
`JobFilterBar.tsx` (1127), `ContributeSheet.tsx` (995),
`CommunitySubmissionsQueue.tsx` (952), `ui/sidebar.tsx` (818),
`ui/data-grid/DataGrid.tsx` (707).

`features/jobs/components/CategoryPage.tsx:1` is a client component that mounts
the 1313-line `CategoryPageView` — **the entire category feed is
client-rendered.**

---

## 2. The feed list — the `JobCardResponsive` comment, verified

Actual sizes: `JobCard.tsx` **270**, `JobCardMobile.tsx` **169**,
`JobCardResponsive.tsx` **116**, `AutoFitBadges.tsx` **110**.

**The comment at `JobCardResponsive.tsx:30-43` is right about the double-render
window, and wrong about the subscriptions.**

- The double render is real but **bounded to one commit**. `isMdUp` is `null`
  until the effect runs (`:62-70`), so both `{isMdUp !== true && …}` and
  `{isMdUp !== false && …}` (`:74`, `:90`) render during SSR and the first
  client paint. After `update()` (`:66`) sets it, one tree survives.
- `ResizeObserver` ×2 per row during that window, via
  `AutoFitBadges → useElementSize → new ResizeObserver`
  (`hooks/useResizeObserver.ts:36-38`). The mobile variant has none.
- **"two saved/tracker subscriptions" is stale.** `useFirebaseSaved` is now a
  module-level `useSyncExternalStore` with one ref-counted RTDB `onValue` per
  tab (`useSavedJobs.ts:100-153`), and `useTrackerWriter`
  (`useFirebaseTracker.ts:63-102`) opens **no** subscription at all. The comment
  at `useJobCardActions.ts:26-32` is also stale.

### Per-instance hook census

`useJobCardActions` = **9 hooks**: `useRouter` (`:65`), `useSearchParams`
(`:66`), `useAuth` (`:67`), `useFirebaseSaved` (`:68`), `useTrackerWriter`
(`:71`), 2×`useMemo` (`:102`, `:106`).

| | hooks | ResizeObservers | matchMedia | context | store subs |
|---|---|---|---|---|---|
| `JobCardResponsive` | 2 | 0 | **1/row** | 0 | 0 |
| `JobCard` | 9 + `useCommentCount` | **1** | 0 | 2 | 1 |
| ↳ `CompanyLogo` | **7** (3 `useMemo`, 4 `useState`) | 0 | 0 | 0 | 0 |
| ↳ `AutoFitBadges` | 4 | 1 | 0 | 0 | 0 |
| ↳ `JobCardBadges` ×2 (visible + measure strip) | 2× `useRouter` | 0 | 0 | 0 | 0 |
| `JobCardMobile` | ≈ **29** with children | **0** | 0 | 2 | 1 |

**`SkillPill` double-hooks.** `SkillPill.tsx:106` calls `useSkillIcon(skill)`,
then renders `<SkillIcon>` (`:138`) which calls it **again** (`:70`). Each
`useSkillIcon` = 2×`useState` + `useEffect` → `loadIcons` across 3 providers
(`:45`). **One visible skill pill = 2 iconify network loads for the same icon.**

### At 100 cards, first paint, both variants mounted

- 100 `MediaQueryList` objects + 100 `change` listeners
- **200** `useJobCardActions` → 200 `useRouter`/`useSearchParams`/`useAuth`/etc.
- **200** `CompanyLogo` → ~1,400 hooks; on a `BRAND_DOMAINS` miss,
  `Object.entries(BRAND_DOMAINS).find(…)` (`:84`) linearly scans a 253-line map
  (`packages/utils/src/domains.ts`) — up to 200 full scans
- **100** `ResizeObserver`s, plus 200 `JobCardBadges`
- 100 `useCommentCount` registry entries (batched to one request per 120 ms)
- Skill pills: the hidden strip renders **all** skills (`AutoFitBadges.tsx:106`)
  and mobile renders 2 (`:69`), so ≈ `(skills + 2) × 100` pills × 2 icon loads

---

## 3. List rendering

**No list anywhere in the app is virtualized.** `@tanstack/react-virtual` is a
declared dependency (`package.json:59`) with **zero imports**. Also declared and
never imported: `react-window`, `react-virtualized`, `supercluster` (`:84`),
`@base-ui/react` (`:21`), `dompurify` (`:68`).

All feed lists are `slice` + plain `.map`:

| Surface | Mechanism | Cap |
|---|---|---|
| `OpportunitiesFeedClient.tsx:249` → `OpportunityGrid.tsx:80-111` | `slice(0, visibleCount).map` | 20/page (`feedPageSize.ts:8`), **unbounded on scroll** (`:236`) |
| `CategoryPageView.tsx:938` | same | 20, +20 per hit (`:276`) |
| `ForYouTab.tsx:161` | same | 20, +20 (`:58`) |
| `OpportunityGrid.tsx:80` | `.map`, no windowing | unbounded |

Keys: feed lists key on `opp.id` (`OpportunityGrid.tsx:82`,
`CategoryPageView.tsx:957,988`, `ForYouTab.tsx:162`) — **correct.** Index keys
are confined to skeleton arrays (`OpportunitySkeletons.tsx`,
`AdminSkeletons.tsx`) and to genuinely positional rendering
(`GovernmentJobDetailView.tsx`).

**`React.memo` is absent everywhere.** The only `memo` in `apps/web/src` is
`ui/BlurImage.tsx:17`.

Memo would not help as written — the props are defeated at every call site:
- `OpportunityGrid.tsx:87-93` new `job` object literal per render;
  `:97`, `:103-108` new closures
- `CategoryPageView.tsx:961-1015` — **8 closures per row per render**
- `ForYouTab.tsx:177-194` — 3 per row
- `OpportunityRow.tsx` gets the same treatment at
  `CategoryPageView.tsx:961-984` and `ForYouTab.tsx:177-178`

---

## 4. Memoisation debt

**`useMemo` whose dependencies are recreated every render, so it never hits:**

- `JobCard.tsx:87` — `buildMetaItems(job, …)` is **not memoized at all** and
  returns a fresh `MetaItem[]` per render. It is a dep of `AutoFitBadges`'s
  `useLayoutEffect` (`:75`), so that effect re-runs on every parent render.
- `AutoFitBadges.tsx:57` — `contentKey` rebuilt per render:
  `metaItems.map(m => \`${m.key}\u0001${m.value}\`).join('\u0002')` +
  `skills.join()`. At 100 cards × ~7 entries that is **~700 string concats per
  render pass**, purely to hit the guard at `:61`.
- `CompanyLogo.tsx:103` — `cacheKey = candidates.join('|')` per render, against
  an **unbounded** module-level `logoCache` `Map` (`:11`).
- `OpportunitiesFeedClient.tsx:295-307` — `jsonLd` object (with a `.map` over 10
  items) rebuilt per render; only the first 10 are ever serialized.
- `useOpportunitiesFeed.ts:401-407` — `sortKeys` `Map` built with a
  `new Date().getTime()` per opportunity, **inside** the memo at `:349`. That
  memo's dep list includes `savedJobsMap` (`:475`), so **every bookmark toggle
  re-filters, re-enriches and re-sorts the whole hydrated feed** and allocates
  new object identities for every item (`:377-386`).
- `filterOpportunities.ts:202-208` — `qualMap` `Record` re-allocated **per
  opportunity** inside the `.filter` callback instead of hoisted to module scope.
- `filterOpportunities.ts:414-420` — `yearBuckets.forEach` re-filters the whole
  `declaredYearsByJob` array once per year: **O(years × jobs)**. Called from
  `OpportunitiesFeedClient.tsx:206` and `CategoryPageView.tsx:7`.

**Missing `useCallback` in the hot path** — all recreated per card render in
`useJobCardActions`: `handleSaveClick` `:141`, `handleApplyClick` `:157`,
`handleCardClick` `:174`, `handleLinkClick` `:184` (a *factory*, called in JSX
at `JobCard.tsx:200,237`, minting a fresh closure per render),
`handleAdminEditClick` `:190`. `CompanyLogo.tsx:153,164` are also unmemoized and
passed into `BlurImage` (`:227-228`), defeating its `memo`.

**Effect with no dependency array, per card instance:**
`useCommentCounts.tsx:131-133` — `useEffect(() => { cbRef.current = setCount; })`
runs after **every** render of every card.

---

## 5. Layout thrash

**`AutoFitBadges` — the exact loop.** `useLayoutEffect` at
`AutoFitBadges.tsx:59-75`:

1. `strip.querySelectorAll('[data-meta-strip] > span')` (`:64`)
2. `strip.querySelectorAll('[data-skill]')` (`:65`)
3. `strip.querySelector('[data-overflow]')` (`:66`)
4. `getBoundingClientRect().width` over **every** element in all three lists
   (`:69`, `:70`, `:71`)
5. `setWidths(…)` (`:74`) — **a state write inside a layout effect**, forcing a
   synchronous re-render before paint

Because it is a *layout* effect, the browser must flush layout first. At 100
cards that is one forced flush per commit plus ~`(meta + skills + 1) × 100` rect
reads. It is guarded by `measuredKeyRef` (`:61`) — but the guard only holds
because `contentKey` is content-derived, while the un-memoized
`buildMetaItems` at `JobCard.tsx:87` still forces the effect **body** to re-run
every render.

The hidden strip is not free: `AutoFitBadges.tsx:100-107` renders a **second
full `JobCardBadges` with every skill** inside each card, so every skill pill is
mounted twice — 2 icon fetches each — before any fitting happens.

**Other forced or repeated layout reads:**

- `hooks/useResizeObserver.ts:23` — `getBoundingClientRect()` inside the
  observer callback and on mount (`:34`). Per card, a second read of the element
  the layout effect just measured.
- `CategoryPageView.tsx:404` — `getBoundingClientRect().top` inside a
  `ResizeObserver`, then writes `feedEl.style.height` in the same callback
  (`:408`). Guarded by `appliedTop` (`:400,405`) against the loop the comment at
  `:392-396` describes. Also `window.addEventListener('resize', update)` (`:413`)
  — **unthrottled**.
- `CategoryPageView.tsx:965` — `el.offsetTop`/`offsetHeight` in a `onMouseEnter`,
  feeding `setHoverRect` (`:966`) which drives inline `top`/`height` at
  `:932-933`. Read-then-write per row hover.
- `features/resources/components/ResourceCard.tsx:113-137` — `scrollHeight` in a
  `ResizeObserver` + `setShowChevron` write, **per card**, plus a window
  `resize` listener (`:126`).
- `JobFilterBar.tsx:176`, `ui/sidebar.tsx:332,358`,
  `AdminResourcesClient.tsx:203` (in an effect keyed on `search`, so per
  keystroke).

---

## 6. Images

17 `<img>` sites. The clear misses:

| File:line | `loading` | explicit w/h |
|---|---|---|
| `features/rooms/RoomMembers.tsx:67` | **none** | **none** (CSS only) |
| `features/rooms/RoomDetail.tsx:215` | **none** | **none** (CSS only) |
| `features/jobs/components/PageTagLinks.tsx:73` | **none** | **none** |
| `features/profile/.../HeadlineSection.tsx:102` | — | — |

The first two are **remote avatar URLs with no dimensions and no lazy loading**.

`CompanyLogo.tsx:232` sets `unoptimized={true}` on every logo, and
`next.config.ts:176-183` sets `remotePatterns` to `hostname: '**'`. So any host
is accepted and the optimizer is bypassed. Logos are 48×48 (`:224-225`) but
fetched from `https://www.google.com/s2/favicons?domain=…&sz=128` (`:96`) — a
128px image rendered at 48px, **plus** a second 16px request for the placeholder
(`:140`).

`@heroicons/react` and `lucide-react` are both in `optimizePackageImports`
(`next.config.ts:165-166`), so barrel imports are handled there — except
`NavMegaMenu.tsx:5` and `SkillPill.tsx:34` use the barrel form anyway.
`@iconify/react` (`SkillPill.tsx:6`) is **not** in the list and pulls the full
icon-loader runtime plus a network round-trip per skill per provider (`:43-45`).

---

## 7. Bundle weight

**Declared dependencies with zero imports in `apps/web`:**

| Package | Note |
|---|---|
| `recharts` (`:82`) | imported only by `ui/chart.tsx:4` and `ui/chart-area-interactive.tsx:4` — both unused chart shells |
| `framer-motion` (`:71`) | the **only** import in the whole app is a *type* import (`ui/motion-constants.ts:1`); zero `motion.` / `AnimatePresence` usage |
| `supercluster` (`:84`), `@types/supercluster` (`:60`) | none |
| `@base-ui/react` (`:21`) | none |
| `dompurify` (`:68`) | none |
| `@tanstack/react-virtual` (`:59`) | none |

`lenis` (`:72`) is real but landing-only (`features/landing/SmoothScroll.tsx:4`).
`@dnd-kit/*` (`:22-25`) is real but only in the dev demo route
`app/dev/dashboard-01/_components/data-table.tsx:14-22`.

**Data modules shipped to the client:**

- `CompanyLogo.tsx:6` imports `BRAND_DOMAINS` from
  `@fresherflow/utils/domains` — a 253-line map shipped to the browser for one
  card-logo lookup
- `useProfileForm.ts:3` pulls `COMMON_SKILLS, INDIAN_CITIES, TOP_TECH_HUBS`
- `EducationSection.tsx:4-5` pulls `DIPLOMA_DEGREES, UG_DEGREES, PG_DEGREES,
  getSpecializations` + `INDIAN_STATES`
- `LogisticsSection.tsx:6` imports `INDIAN_CITIES` from `@fresherflow/constants`,
  whose barrel pulls `skillTaxonomy.ts` (418 lines)
- `NavMegaMenu.tsx:23-45` hardcodes its own `BOARDS`/`LOCATIONS`/`SKILLS`/
  `BATCHES`/`ROLES` arrays

**Barrel re-exports pulling weight for one symbol:**
`JobCardMetaConfig.ts:14` imports `getAtsName` from
`@/features/jobs/hooks/useOpportunitiesFeed` — **a 552-line feed hook** pulled
into the card module graph for one 58-line string function.

---

## 8. Event handler churn

Scroll listeners are correctly `{ passive: true }` (`useMarqueeHidden.ts:22`,
`ScrollToTop.tsx:13`, `DesktopNav.tsx:48`, `MobileTopNav.tsx:94`,
`MobileBottomTabs.tsx:88`, `NavMegaMenu.tsx:90`, `JobFilterBar.tsx:225`).

**No `resize` listener is throttled:** `OpportunitiesFeedClient.tsx:86`,
`CategoryPageView.tsx:413`, `useResizeObserver.ts:40`, `ResourceCard.tsx:126`
(**one per card**), `ProgrammaticHub.tsx:72`, `JobFilterBar.tsx:226`.

Inline handlers on hot rows: `OpportunityGrid.tsx:97,103` (2/row);
`CategoryPageView.tsx:961,963,968,972,993,999,1000,1006` (8/row);
`ForYouTab.tsx:177,178,194` (3/row); `JobCardBadges.tsx:118` (one per skill
pill); `JobCardMenu.tsx:37,47,58,72,83,95` (6 per desktop card);
`OpportunityRow.tsx:84-89,111-114` (2/row).

**Module-scope side effect:** `useSavedJobs.ts:62-74` adds a window `storage`
listener at import time, and `:47` runs `getLocalSaved()` — a `localStorage`
read plus 3 legacy-key `JSON.parse`s — at **module evaluation**, for every tab
that imports the module whether or not a saved-jobs consumer mounts.

---

## 9. Duplicated work per row

| Computation | Duplicated at | Times per card render |
|---|---|---|
| `getPostedLabel` | `useJobCardActions.ts:139`, `JobCardMetaConfig.ts:66` | 2× (each allocates a `new Date`, `jobCardUtils.ts:150`) |
| `isJobExpired` | `useJobCardActions.ts:76`, `JobCardMetaConfig.ts:137,174` | **3×** |
| `getDriveDetails` | `useJobCardActions.ts:128`, `JobCardMetaConfig.ts:72`, `jobCardUtils.ts:109` | 2–3× (allocates a spread object each call) |
| `resolvePassoutYears` / `formatPassoutYears` / `formatEducationEligibility` | `JobCardMetaConfig.ts:98-99,104` and `:155-156,161` — **both branches of the same `if/else`** | 1 per branch; each regex-scans title **and description** |
| `getAtsName` | `JobCardMetaConfig.ts:68` (constructs a `new URL` per call), `filterOpportunities.ts:159,399` | 1/card + 2/item |
| `parseOpportunityLocation` | `useJobCardActions.ts:113` | 1× — allocates 3 arrays + a `Set` per call |
| `isFreshlyPosted` | `JobCard.tsx:136` **and** `:165` | 2× |
| `formatNextWalkinLabel` | `WalkinEventWidgets.tsx:25`, rendered twice (`JobCard.tsx:131,157`) | 2× |
| `useSkillIcon` | `SkillPill.tsx:106` + `:70` | 2 icon fetches per skill per variant |
| `qualMap` object | `filterOpportunities.ts:202-208` | once **per opportunity** inside the loop |
| `new Intl.NumberFormat("en", …)` | `columns.tsx:129` | constructed inside a column `cell` renderer — **per row, per render** |
| `toLocaleString` in a map | `CompaniesDirectoryClient.tsx:217`, `RoomsDirectory.tsx:146,223` | per row |

`useOpportunitiesFeed.ts:349-475` — the whole `filterOpportunities → map(enrich) →
sortKeys Map → sort` pipeline is one `useMemo` whose dep list includes
`savedJobsMap` (`:475`). **Every bookmark toggle re-runs it over the entire
hydrated feed and returns new object identities for every item**, propagating
through `OpportunityGrid.tsx:87-93` and re-rendering all mounted cards.

---

## 10. Animations

**Layout-property animations (force layout, not compositor):**

- `app/globals.css:1242-1257` — `@keyframes ff-collapsible-slide-down/up`
  animate **`height`**, applied to `[data-slot='collapsible-content']` at
  `:1236-1241`. Every collapsible in the app animates height. Disabled under
  `prefers-reduced-motion` (`:1258-1263`).
- `ui/sidebar.tsx:246` `transition-[width] duration-200`; `:256`
  `transition-[left,right,width]`; `:628` `transition-[width,height,padding]`;
  `ui/site-header.tsx:6` `transition-[width,height]`
- `CategoryPageView.tsx:931-934` — the split-view hover highlight is positioned
  by inline `top`/`height`, rewritten on every row `mouseenter` (`:965-966`)

**Long-running animations never paused off-screen:**

- `app/globals.css:602-608` — `.ff-marquee-track { will-change: transform;
  animation: ticker 70s linear infinite; }` with `@keyframes ticker`
  (`:545-552`). Runs indefinitely while in the document. No
  `IntersectionObserver` pause, no `animation-play-state` gate. Killed only
  under `prefers-reduced-motion` (`:614-617`).
- `features/landing/SmoothScroll.tsx:20-25` — an unconditional
  `requestAnimationFrame` loop calling `lenis.raf(time)` for the entire lifetime
  of the landing page, regardless of scroll activity or visibility.

**Animation re-declared per render:** `OpportunitiesFeedClient.tsx:311-328`
injects an inline `<style>` element containing `@keyframes staggerFadeIn` **and
the whole keyframe body** on every render, matched by
`[role="list"] > [role="listitem"]` (`:312`). Because the per-`nth-child` delay
ladder caps at `:323` (`nth-child(n+8) { animation-delay: 280ms }`), **every row
past the 8th fires simultaneously at 280 ms.**

**Correct (compositor-only):** `globals.css:1076-1085` `slide-up-fade`,
`:324-327` `staggerFadeIn`, `ui/Dialog.tsx:42`, `ui/BlurImage.tsx:54,67`,
`ui/Button.tsx:18`.

---

## Config notes

`next.config.ts:158-172` — `optimizePackageImports` for 7 packages (including
both icon libraries), `staleTimes` 300s dynamic / 1800s static, AVIF+WebP
(`:175`), `serverExternalPackages` for 20 Node-only modules (`:129-153`),
`remotePatterns` `hostname: '**'` (`:179`). Build uses `next build --webpack`
(`package.json:11`), **not** Turbopack.
