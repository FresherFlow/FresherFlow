# Audit 02 — State management and data hooks

Read-only. Scope: `apps/web/src/hooks`, `features/**/hooks`, and every context
provider.

Note: `useOpportunityDerivedState.ts`, `useOpportunityDetail.ts` and
`useProfileFilters.ts` were being edited by another agent during this audit, so
their line numbers may shift.

---

## 1. Hook inventory

### Generic (`src/hooks/`)

| File | Lines | Owns | Consumers |
|---|---|---|---|
| `useDebounce.ts` | 20 | value debounce | `useOpportunitiesFeed.ts:122`, `useAdminOpportunities.ts:48` |
| `useIsMobile.ts` | 32 | <1024px via `matchMedia` | `ui/sidebar.tsx:76` |
| `use-mobile.tsx` | 19 | **duplicate** <768px hook | `dev/dashboard-01/…/data-table.tsx:675`, `ui/chart-area-interactive.tsx:140` |
| `useMediaQuery.ts` | 40 | device bucket (1024/640) | `ui/ResponsivePopover.tsx:48` |
| `useClickOutside.ts` | 20 | outside-click | `JobsFilterBar.tsx:128`, others |
| `useResizeObserver.ts` | 50 | element size | **no in-scope consumer found** |
| `useIntersectionObserver.ts` | 29 | sentinel visibility | `CategoryPageView.tsx:176`, `OpportunitiesFeedClient.tsx:77`, `ForYouTab.tsx:54` |
| `useMarqueeHidden.ts` | 27 | scroll>120 header | landing header |
| `useGeolocation.ts` | 95 | geolocation + localStorage cache | CategoryPage pages |
| `useCopyToClipboard.ts` | 56 | copy + timer | several |
| `use-dialog-state.ts` | 19 | dialog toggle | admin |
| `useOfflineActionQueue.ts` | 12 | `useSyncExternalStore` over action queue | offline badge |

### Feature hooks

| File | Lines | Consumers |
|---|---|---|
| `jobs/hooks/useCategoryPageState.ts` | **1106** | `CategoryPage.tsx:27` |
| `jobs/hooks/useOpportunitiesFeed.ts` | 552 | `useCategoryPageState.ts:668`, `OpportunitiesFeedClient.tsx:183`, `ForYouTab.tsx:39` |
| `jobs/hooks/useOpportunityDetail.ts` | 391 | `OpportunityDetailPane.tsx:94` |
| `jobs/hooks/useOpportunityDerivedState.ts` | 93 | `OpportunityDetailPane.tsx:96` |
| `jobs/hooks/useProfileFilters.ts` | 264 | `useCategoryPageState.ts:96`, `useOpportunitiesFeed.ts:79`, `PersonalizationBar.tsx:50` |
| `jobs/hooks/useCommentCounts.tsx` | 143 | `OpportunitiesFeedClient.tsx:466` |
| `jobs/hooks/useOpportunityReport.ts` | 38 | detail components |
| `dashboard/hooks/useSavedJobs.ts` | 195 | `useOpportunitiesFeed.ts:88`, `useJobCardActions.ts:64` |
| `dashboard/hooks/useFirebaseTracker.ts` | 196 | `useOpportunityDetail.ts:47`, `useJobCardActions.ts:67` |
| `notifications/hooks/useUnreadNotifications.ts` | 248 | nav bell |
| `profile/hooks/useProfileForm.ts` | 224 | profile editor |
| `profile/hooks/useProfileUpdateHandlers.ts` | 184 | profile editor |
| `profile/hooks/useProfileCompleteHandlers.ts` | 191 | onboarding |
| `profile/hooks/usePublicProfileView.ts` | 85 | `/u/[username]` |
| `profile/hooks/usePublicPageActivation.ts` | 59 | profile card, dashboard |
| `profile/hooks/useIntroRequest.ts` | 95 | public profile |
| `admin/opportunities/useOpportunityForm.ts` | **1584** | admin form pages |
| `admin/opportunities/hooks/useAdminOpportunities.ts` | 150 | admin list |
| `admin/opportunities/hooks/useAdminOpportunityActions.ts` | 214 | admin list |
| `admin/opportunities/hooks/useOpportunityFormHandlers.ts` | 197 | admin form |
| `admin/opportunities/hooks/useOpportunityFormDerived.ts` | 32 | admin form |
| `admin/moderators/useModerators.ts` | 192 | admin |
| `admin/hooks/useFirebaseAdmin.ts` | 40 | admin shell |
| `companies/hooks/useFirebaseFollowedCompanies.ts` | 58 | company pages |
| `navigation/useNavCounts.ts` | 142 | nav rail |
| `navigation/sidebarState.ts` | 264 | nav shell |
| `moderation/moderationAuth.ts` | 53 | moderation area |
| `profile/components/editor/SectionFooter.tsx` | 62 | profile sections |
| `app/(admin)/admin/users/_components/UsersProvider.tsx` | 99 | admin users |

**Over 300 lines:** `useCategoryPageState.ts` (1106),
`useOpportunityForm.ts` (1584), `useOpportunitiesFeed.ts` (552),
`useOpportunityDetail.ts` (391).

**`useCategoryPageState` carries 10 distinct responsibilities** and returns
**99 keys** (`:1004-1103`):

1. URL→state sync (`:388-439`)
2. state→URL writer with debounce (`:479-646`)
3. `window.history` manipulation + `popstate` (`:118-219`, `:148-162`)
4. viewport detection (`:131-146`)
5. filter seeding/ownership from profile (`:301-374`)
6. detail-pane selection policy (`:804-857`)
7. `document.title` + head `MutationObserver` (`:759-798`)
8. 14 mobile-drawer draft fields (`:254-287`, `:863-904`)
9. pagination (`:290`, `:442-462`, `:695-697`)
10. facet counts (`:699-725`)

---

## 2. Duplicated state machines

- **URL↔filter sync, implemented twice with different mechanisms.**
  `useCategoryPageState.ts:388-439` (in) + `:479-646` (out, silent
  `history.replaceState` after 300ms) vs `useAdminOpportunities.ts:86-106` (in) +
  `:109-124` (out, `router.replace`). The admin version guards the loop with
  `isInternalUrlSyncRef` (`:87-90,121`); the jobs version guards only with a
  signature string (`appliedUrlSignature`, `:386,411`) **and** reconciles a
  separate `job` param outside that guard (`:395-399`).

- **Filter draft vs applied, duplicated twice with different field sets.**
  `useCategoryPageState.ts:254-287` + `:863-904`, and independently
  `OpportunitiesFeedClient.tsx:148-159,261-293` — the client version has
  `draftType` but **no** `draftSkills`/`draftRole`/`draftWorkMode`/`draftDriveDate`/
  `draftDriveRadiusKm`, and hard-resets `workMode: null, skills: []` on apply
  (`:286-287`).

- **Mobile drawer active-filter count, three computations.**
  `useCategoryPageState.ts:464-477` (13 terms),
  `OpportunitiesFeedClient.tsx:161-171` (11),
  `MobileFilterDrawer.tsx:208-220` (11 different — counts `draftType`, omits
  `workMode`, `skills`, `role`). **Same badge, three answers.**

- **Pagination `visibleCount`, four independent implementations.**
  `useCategoryPageState.ts:290` + **two overlapping** reset effects (`:442-462`
  hardcoding `20`, `:695-697` using `FEED_PAGE_SIZE`); consumed at
  `CategoryPageView.tsx:274-278` incrementing by a **literal** `20`;
  `OpportunitiesFeedClient.tsx:66,209-211,232-240` (with `isLoadingMore` +
  `setTimeout`); `ForYouTab.tsx:53,56-60`.

- **Selected-opportunity state machine.** `useCategoryPageState.ts:111,181-219,804-857`
  (three effects) vs `OpportunitiesFeedClient.tsx:65,94-128,219-247` (two effects,
  **no `?job=` URL at all**, and `pushState` with the *same* URL at `:115`).

- **Search query, four readers.** `useCategoryPageState.ts:221-223` sanitises on
  init but `:414` re-syncs from URL **without** `sanitizeSearchQuery` —
  two different initial/re-sync paths for one field.
  `OpportunitiesFeedClient.tsx:63,90-92` reads `query|q|skill`;
  `useJobCardActions.ts:36` reads a fourth set (`q, search, skill, query`).

- **`isDesktop`, three implementations.** `useCategoryPageState.ts:129-146`
  (1280 + `pointer:coarse`), `OpportunitiesFeedClient.tsx:71-88` (1024, no
  coarse check), `ForYouTab.tsx:66-73` (48rem), plus `JobCardResponsive.tsx:65`.

---

## 3. Effect correctness

### `useCategoryPageState.ts`

| Lines | Verdict |
|---|---|
| `:131-146` resize/orientation | **OK** — cleanup correct; `matchMedia` read once with no change listener, so a pointer-type change never re-evaluates |
| `:148-162` popstate | **OK** — cleanup present |
| `:293-295` `setMounted(true)` | **RISKY** — harmless, StrictMode double-fires |
| `:351-363` profile seeding | **RISKY** — `applyProfileSeeds` is a `useCallback` on `[profileFilterPrefs, profileSeed]` (`:324`), and `profileFilterPrefs` is a **new object identity** from `useProfileFilters.ts:103` on every store write, so the effect re-runs on unrelated pref writes |
| `:379-381` `searchParamsRef` | **OK** — no dep array, deliberately every render |
| `:388-439` URL→state | **RISKY** — deps `[searchParams, pathname]`; `initialFilters` is used inside (`:417-437`) and is **not** in the array. Also calls `setSelectedOpp(null)` (`:398`), which it does not depend on |
| `:442-462` pagination reset | **RISKY** — `filters.workMode` array identity in deps; a new identity re-fires. Reads `visibleCount` without depending on it (correct), but combined with the StrictMode rebuild above it double-resets |
| `:479-646` URL writer | **BROKEN** — the cleanup at `:624-626` clears `replaceTimerRef` on **every** dep change, but the effect body only re-arms when `changed` (`:604-621`). A render with a changed dep but `changed === false` clears the previously scheduled timer and never re-arms it, so **that URL write is silently lost** |
| `:759-798` title + `MutationObserver` | **RISKY** — deps include the whole `filters` object (`:798`), so a new identity re-creates the observer |
| `:804-826` `?job=` resolution | **RISKY** — reads `selectedOpp?.id` (`:825`) but depends on the whole `selectedOpp` object; `resolvedJobRef` (`:803`) is an "asked already" latch that never resets when the feed re-filters the same key away |
| `:829-847` auto-select | **OK** deps |
| `:850-857` clear on GOVERNMENT/WALKIN | **OK** — but it writes `selectedOpp`, which `:829-847` also writes. **Two effects fighting over one field** for those types |
| `:205-218` close pane | **RISKY** — bare `setTimeout(…, 250)` with no ref and no unmount cleanup, holding a `setSelectedOpp` + `window.history.back()` |

**`isFirstRender` is broken under StrictMode** (`:385`). React mounts → effect
runs → `isFirstRender=false` → StrictMode unmount/remount replays the effect with
it already `false`, so the second pass re-parses the URL into fresh filter
arrays, **rebuilding every array identity and resetting scroll + `visibleCount`.**

### `useOpportunitiesFeed.ts`

| Lines | Verdict |
|---|---|
| `:91-93` mounted | **OK** |
| `:141-143` count ref sync | **OK** |
| `:274-280` live-results divergence | **OK** — reads `liveQueryRef` but the state it guards is a dep |
| `:287-294` no-scope fallback | **OK** deps |
| `:298-306` load trigger | **RISKY** — `loadOpportunities` is a `useCallback` on `[user, authLoading, showOnlySaved, cacheScope, initialData]` (`:222`), and `initialData` is **a new object literal from the server on every navigation**, so the effect re-fires, calling `loadOpportunities` again and resetting `page` to 1 and `setHasMore(false)` (`:162-163`). Double-fires under StrictMode |
| `:319-347` full-feed hydration | **OK** — `cancelled` guard and cleanup present |

`Date.now()` is read at `:400` **inside a `useMemo`**, and the memo returns an
unsorted list when `!isMounted` (`:396`). The hydration guard works and is
documented at `:528-533`.

### `useOpportunityDetail.ts`

| Lines | Verdict |
|---|---|
| `:39-41` `initialDataRef` | **OK** |
| `:163-197` description upgrade | **OK** — `cancelled` guard, cleanup present |
| `:199-224` load/reset | **BROKEN** — deps `[id, initialData, initialDataId, opp?.id, loadOpportunity]`. It both **reads** `opp?.id` and **writes** `opp` (`:202,209`), so the effect re-runs after every `setOpp` — which is why the `id !== initialData.id` guard exists. With no `initialData` it unconditionally does `setOpp(null)` (`:209`) then re-loads. It also resets `hasShownNotFoundRef` (`:223`) on every re-run, so a genuine load error can re-toast |
| `:226-230` `saveRecentViewed` | **RISKY** — writes to `localStorage` on every `opp` identity change, including the SSR-sourced `initialData`; `saveRecentViewed` calls `Date.now()` (`lib/cache/recentViewed.ts:44`) |
| `:232-237` view analytics | **OK** — ref-latched |

**No request-id race guard.** `loadOpportunity` (`:70-156`) is `useCallback` on
`[id]` only, and `lastRequestTimestamp` is unused here, so a double-invoked load
inside the broken effect can **resolve out of order.** `useOpportunitiesFeed`
guards this with `liveRequestIdRef`; this one does not.

### Generic hooks

| File:lines | Verdict |
|---|---|
| `useIntersectionObserver.ts:11-26` | **OK** cleanup; deps correctly omit `options.root`; the eslint-disable at `:25` is warranted. The returned `targetRef` is a `useCallback` ref, so passing a **ref object** as `root` (`OpportunitiesFeedClient.tsx:80`) reads `.current` **during render** — always `null` on first render |
| `useResizeObserver.ts:18-47` | **OK** cleanup, but `ref` is captured once and the effect has `[]` deps — if the ref attaches after mount (the `ConditionalRef` pattern) the observer **never attaches** |
| `useClickOutside.ts:19` | **RISKY** — `handler` is in deps. `JobsFilterBar.tsx:128` and the `use-mobile`-style inline arrows pass a fresh closure each render, so both `mousedown` and `touchstart` are removed and re-added on **every render** |
| `useCopyToClipboard.ts:51-53` | **OK** — `clearTimer` is in cleanup but recreated per render and not in deps; safe, it only touches a ref |
| `useSavedJobs.ts:62-74` | **RISKY** — module-level `window.addEventListener('storage', …)` at **import time**, never removed. Leaks across HMR/tests; not StrictMode-doubled since it is not an effect |
| `useCommentCounts.tsx:131-133` | **OK** — `cbRef.current = setCount` in an effect with no dep array, re-assigning every render. Deliberate and correct for the pattern |
| `useGeolocation.ts` | **OK** — no effects; `readCachedLocation` is a lazy `useState` init, so it runs on the server too and returns `null` there |
| `AuthContext.tsx:467-505` | **BROKEN** — `unsubscribe` is assigned **inside** the async `import(...).then(...)`, so the returned cleanup almost always sees `undefined` and the `onAuthStateChanged` listener **leaks**. Under StrictMode the effect runs twice → two listeners |
| `AuthContext.tsx:191-199` | **RISKY** — three separate `readCachedSession()` calls in three `useState` initializers; the first (`:180-184`) also performs a side effect (`setClientSessionHints()`) **inside a state initializer** |
| `AuthContext.tsx:408-442` | **RISKY** — `updateProfileState` calls `setProfile` and, **inside the `setProfile` updater**, performs side effects: `writeCachedSession` (`:412`) and a floating `import(...).then(...)` (`:415-420`). It also nests `setUser` → `setProfile` (`:425-433`). Side effects inside a state updater are **double-invoked under StrictMode**, so `writeFirebaseProfile` fires twice |
| `InstallPromptProvider.tsx:72-90` | **OK** — `setTimeout(0)` to dodge a sync mount update, timer cleared |
| `PushNotificationProvider.tsx:31-41,43-74` | **OK** — no listeners. But `:55-58` writes `localStorage` and calls `Notification.requestPermission()` **directly in the effect**, i.e. on mount for a signed-in user, with **no user gesture** |
| `OfflineSyncProvider.tsx:12-39` | **OK** cleanup; `user` object is a dep (`:39`), so any auth re-render re-runs `trySync` |
| `ServiceWorkerRegister.tsx:29-96` | **OK**; the `sessionStorage` write at `:83-88` is not idempotent-guarded across the `controllerchange` reload path |
| `useAdminOpportunities.ts:86-106` | **RISKY** — deps `[searchParamsKey, searchParams]` include both the string and the object; the object identity changes on every restore, so the signature-guard idea used in `useCategoryPageState` is absent. `isInternalUrlSyncRef` can be left `true` if `router.replace` is superseded, **permanently skipping the next parse** |
| `useAdminOpportunities.ts:109-124` | reads `searchParams.toString()` (`:110`) but depends on `searchParams` (`:124`) |
| `useUnreadNotifications.ts:177-245` | **OK** — interval + 3 listeners, all cleaned. But `:189-192` `setTimeout(…, 0)` is **not captured** for cleanup |
| `useModerators.ts:76-94` | **OK** — `cancelled` guard |
| `useOpportunityForm.ts:748-752` | **RISKY** — fires `fetchOpportunityForEdit` and `loadTimelineEvents` on mount with **no `cancelled` flag**, so a StrictMode double-mount double-fetches the edit record |
| `MobileFilterDrawer.tsx:195-204` | Escape listener depends on `onClose`, an inline arrow from `CategoryPageView`, so it **re-subscribes per render** |
| `CategoryPageView.tsx:423-426` | reads `localStorage` with **no `try/catch`** — unlike every other storage read in the codebase. **Throws in private mode** |

---

## 4. Stale closure and identity bugs

- `useCategoryPageState.ts:388-439` — `initialFilters` used (`:417,423-425,429-437`)
  but not in deps. Stale-prop risk on client navigation to a different board.
- `useCategoryPageState.ts:798` — the whole `filters` object in deps instead of
  the seven fields actually read at `:763-769`.
- `useCategoryPageState.ts:939-1002` — `draftMatchCount` depends on `savedIds`
  and `draftBaseInputs` (`:1000-1001`), both **new objects every render**
  (`useOpportunitiesFeed.ts:543-550` builds `draftBaseInputs` inline).
  **The memo never hits.**
- `useCategoryPageState.ts:304-324,328-346` — `useCallback`s keyed on
  `profileFilterPrefs` (a fresh object per store notification), so
  `applyProfileSeeds`/`removeProfileSeeds` are unstable and re-trigger `:351-363`.
- `useOpportunitiesFeed.ts:475` — the filter memo **omits `personalize`**
  while `layerOn` at `:392` reads it.
- `useOpportunitiesFeed.ts:145-222` — `loadOpportunities` closes over
  `initialData` (`:157,161`); identity changes per navigation.
- `useOpportunityDerivedState.ts:18-92` — `useMemo` deps `[opp, now]` where `now`
  comes from `useState(() => Date.now())` (`:17`). **`now` never changes, so
  `upcomingTimelineEvents` (`:55`) is frozen at mount** for the pane's lifetime —
  a long-lived pane silently shows past events as upcoming. Two "correct"
  choices (`useState` is stable) masking a staleness bug.
- `AdminContext.tsx:248-267` — `checkSessions` deps `[checkSessions, router,
  authUserId]`; `authUser` is passed as an **argument and is not a dep**, so a
  user whose email/name change keeps the old moderator name. Deliberate and
  documented at `:264-266`.
- `usePublicPageActivation.ts:37-56` — `activate` deps include `isPublishing`
  (`:56`), so the callback identity flips twice per click. Harmless, guarded at
  `:38`.

**Dead refs/state:** `useOpportunityDetail.ts:45` `hasAttemptedLoadRef` — assigned
at `:212`, **never read**. `AuthContext.tsx:201` `isLoggingOut` — set, never read
(eslint-disabled at `:200`). `AuthContext.tsx:204`
`lastVisibilityRefreshAtRef` — **never read**, only assigned at init.

**`useTrackerWriter` vs `useFirebaseTracker`** (`useFirebaseTracker.ts:63-102`
and `:104-195`) — the same `writeTrackerItem`/`removeTrackerItem` logic is
implemented **twice**: the first updates `localStorage` only, the second updates
state *and* `localStorage`. `useOpportunityDetail.ts:47` uses the map version,
`useJobCardActions.ts:67` the writer version. **A save from a card is invisible to
a detail pane's map until RTDB round-trips.**

---

## 5. Storage access and hydration risk

| Site | SSR guard | Validated | Hydration risk |
|---|---|---|---|
| `lib/cache/recentViewed.ts:16,26` | yes | `Array.isArray` only | no |
| `lib/cache/opportunitiesFeedCache.ts:45,63,81,100,113` | yes | `:90` validates `opportunities[]` + `cachedAt:number`; `:103`, `:117` cast `JSON.parse(raw)` to a map **blind** | no |
| `lib/storage/pendingAction.ts:73,88,103,115` | yes | `isPendingAction` type-guards every field (`:52-70`), including the `jobPath` off-origin check | no |
| `lib/cache/actionQueue.ts:42,53` | yes | `Array.isArray` only; entries cast blind | no |
| `lib/cache/unreadCount.ts:44,57,68` | yes | `:49` TTL check; `parsed.at` read **without a type check** → `NaN` math silently returns fresh | **`readCache()` is called in a `useState` initializer at `useUnreadNotifications.ts:65` → server renders 0, client renders the cached count** |
| `lib/cache/syncStatus.ts:6,11,16` | yes | `readTimestamp` validates `Number.isFinite` (`:19`) | no |
| `hooks/useGeolocation.ts:18-36` | yes | `:23` validates both coords, `:24` TTL | **`useState` initializer at `:44-50` → server `requested:false`, client `requested:true`** |
| `jobs/hooks/useProfileFilters.ts:66-76` | yes | `normalizePrefs` validates both fields (`:56-64`) | **`useState(readProfileFilterPrefs)` at `:101` reads localStorage on the first client render.** The server rendered `DEFAULT_PREFS`. The comment at `:95-98` calls this intentional. Mitigated for the **counts** by `isMounted` in `useOpportunitiesFeed.ts:534-537` — **not for the chips themselves** |
| `useSavedJobs.ts:8-44` | yes | `:12`, `:19` cast `JSON.parse` blind | `getServerSnapshot` returns `emptyMap` (`:87-89`) → **OK, correct pattern** |
| `useFirebaseTracker.ts:16-48` | yes | `:20`, `:26` cast blind | `useState(getLocalTracker)` at `:105`, plus a merge effect at `:109-114` |
| `lib/auth/AuthContext.tsx:37,40,59,71,77,84,95` | `:57,68,76,81` yes; **`:37` and `:40` unguarded** | `:61` `JSON.parse(raw) as CachedSession` **blind** — no field validation, and `isCachedSessionFresh` (`:122`) reads `cached.savedAt` unvalidated | **Guaranteed mismatch on every SSR'd route** — server `user=null`/client from cache. Deliberate and consistent |
| `lib/auth/AdminContext.tsx:46,57,66,82,92,103` | yes | `JSON.parse` cast blind | admin routes are `no-store`; lower risk |
| `notifications/hooks/useUnreadNotifications.ts:42,54` | yes | `Array.isArray` | no |
| `features/navigation/sidebarState.ts:24,28,55,68,89,94,172,182,202,212` | `:24` guarded by `typeof document`; the rest **unguarded** but `try`-wrapped | `:203` value-validated; `:57` `Number.isFinite` + `clamp` | **OK** — the prehydration attribute is written by `HeadInjections.tsx:16` specifically to make this match. `useSidebarVariant` (`:231-238`) deliberately defers to an effect, documented at `:226-230` |
| `features/navigation/AppLayoutProvider.tsx:28,34,48,71` | `:28` guarded; `:34` unguarded (`try`) | includes-check | `useState(readVariant)` (`:95`) → cookie-dependent variant on first client render |
| `features/admin/layout/AdminLayoutProvider.tsx:23,29` | `:23` guarded; `:29` unguarded | includes-check | same at `:66-67` |
| `CategoryPageView.tsx:424,430` | **no `typeof window` check, no `try/catch`** | `=== 'true'` | mount effect, so no SSR mismatch — but **throws in private mode** |
| `RecentlyViewedRow.tsx:29,55,60` | `:27` guarded in the effect; `:55`, `:60` in the click handler **unguarded** but `try`-wrapped | `:32` `Array.isArray` | mount-effect read only |

---

## 6. Hydration hazards on the render path

These are the mismatches the user is seeing. Exhaustive list.

1. **`useProfileFilters.ts:101`** — `useState(readProfileFilterPrefs)` reads
   `localStorage` on the first client render. Consumers: `useCategoryPageState.ts:96`,
   `useOpportunitiesFeed.ts:79`, `PersonalizationBar.tsx:50` (the last guards its
   own DOM with `mounted` at `:84`). **The two hooks do not.**
2. **`useUnreadNotifications.ts:64-72`** — `useState` initializer calls
   `readCache()` + `readRawCache()` (`:75`). Server: 0. Client: stored count.
3. **`AuthContext.tsx:179-199`** — three `useState` initializers each call
   `readCachedSession()`; `:182` performs a **DOM write** inside an initializer.
4. **`useOpportunityDerivedState.ts:17`** — `useState(() => Date.now())`.
   Server and client differ; a borderline event flips between them. **RISKY**,
   not a text mismatch unless an event sits inside the request window.
5. **`DetailTimeline.tsx:11`** — the same `useState(() => Date.now())` pattern,
   independent of the hook. **Two components compute "now" separately.**
6. **`CategoryPageView.tsx:100-107,221-252`** — `useState` initializers read
   `searchParams`. Consistent for the same URL. **OK.**
7. **`useCategoryPageState.ts:129`** — `isDesktop` starts `null`, resolved by the
   first effect. `CategoryPageView.tsx:171,174` branches on `=== false`/`=== true`,
   so SSR takes the `null` branch. **OK — the correct pattern.**
8. **`OpportunitiesFeedClient.tsx:71`** — same `null`-then-effect pattern. **OK.**
   But `:80` passes `isDesktop === true ? leftColumnRef.current : null` as the
   `IntersectionObserver` root **during render**. On a render where the left
   column remounts, `root` is a **stale detached node** and the observer silently
   never intersects.
9. **`ForYouTab.tsx:66-73`** — `null` then effect; `:156` branches on `=== true`.
   **OK**, documented at `:64-65`.
10. **`JobFilterBar.tsx:128` / `JobsFilterBar.tsx:103`** — `isWide` starts
    **`false`**, not `null`, so the first client render matches the server only
    by accident of the SSR-safe default. The first paint shows the non-wide
    layout for one frame. **RISKY, no mismatch.**
11. **`useOpportunitiesFeed.ts:400`** — `Date.now()` inside the memo; the
    `isMounted` guard (`:396`) means server and pre-mount client both get the
    unsorted list. **OK by design**, documented at `:528-533`.
12. **Relative-day formatting from `Date.now()` during render** —
    `jobCardUtils.ts:152,161,172,184`, `OpportunityDetailPane.tsx:59`,
    `DetailHeroSection.tsx:101`, `DetailTimeline.tsx:39`,
    `DetailSidebarActions.tsx:263`, `WalkinEventWidgets.tsx:58`,
    `MobileFilterDrawer.tsx:598`, `GovernmentJobDetailView.tsx:322`. All use
    explicit `'en-IN'`/`'en-US'` locales, which is the right mitigation, but a job
    posted 3.9 days ago reads **"4 days ago" on the server and "3 days ago" on the
    client** at a different UTC hour. `getPostedLabel` is called from
    `useJobCardActions.ts:134` on every render.
13. **`lib/cache/syncStatus.ts:32`** — `toLocaleString()` with **no locale
    argument**, so it depends on the runtime locale. Admin surfaces only.
14. **`TopicBoardPage.tsx:52`** — `cachedAt: cachedAt ?? Date.now()` in a props
    literal: a client/server split in a prop.

---

## 7. Context providers

| Provider | Holds | Re-renders tree | Memoized |
|---|---|---|---|
| `AuthProvider` `lib/auth/AuthContext.tsx:177` | `user, profile, isLoading, skipUsernameSetup` + 9 methods | yes — `value` is an **inline object literal** (`:598`), so every `useAuth()` consumer re-renders on every auth render. `isLoading` flips on every `loadUser` (`:261,399`) and the 10s safety timeout (`:266-280`) | **NO** |
| `AdminProvider` `lib/auth/AdminContext.tsx:118` | `admin, moderator, isLoading` + `hasPermission, logout, refresh` | yes — inline object (`:311-322`); `logout`/`refresh` are plain functions so they change identity every render too | **NO** |
| `AuthFormDataProvider` `lib/auth/AuthFormDataContext.tsx:14` | `email, fullName` | yes — inline object (`:22`) | **NO** |
| `InstallPromptProvider` `:56` | `canInstall, isInstalled, showBanner, dismissBanner, promptInstall` | yes on change | **YES** (`:173-179`) |
| `PushNotificationProvider` `:26`, `OfflineSyncProvider` `:8`, `ServiceWorkerRegister` `:8`, `ConditionalAuthProvider` `:6` | nothing; render `null` | no | n/a |
| `FeedHeaderProvider` `:15` | `count: number \| null` | yes — inline object (`:19`). **Written from three components** — `CategoryPageView.tsx:268-272`, `OpportunitiesFeedClient.tsx:214-217`, `ForYouTab.tsx:47-50` — each a **different feed**, so the count is whichever mounted last | **NO** |
| `CommentCountsProvider` `useCommentCounts.tsx:41` | registry/pending/requested refs; no state | **no** — by design `:113-115` | **YES**, and the value never changes identity (`:115` deps are two stable `useCallback`s). **Best provider in the repo** |
| `AppLayoutProvider` `:94` | `variant, collapsible` | yes | **YES** (`:115-118`) |
| `AdminLayoutProvider` `:65` | same shape, own cookies | yes | **YES** (`:86-89`) |
| `AdminPaletteProvider` `:20` | `open` + 4 callbacks | yes | **YES** (`:41-44`) |
| `UsersProvider` `:38` | 9 dialog slots | yes | **YES** (`:56-90`) |

**Consumers that could read state directly instead of via context:**
`useProfileFilterPrefs` is called independently in `useCategoryPageState.ts:96`,
`useOpportunitiesFeed.ts:79`, and `PersonalizationBar.tsx:50` — **three
subscriptions to one module store, each with its own `useState`.**
`useTrackerWriter` vs `useFirebaseTracker` is the clearest case of a hook that
could replace a provider: the writer variant holds no shared state, so the
tracker *could* be a module store like `useSavedJobs`.

---

## 8. Cross-hook contradictions

1. **Active filter count, three ways** — see §2. Then
   `CategoryPageView.tsx:440-443` builds `activeFilterTally = mobileActiveCount +
   (search ? 1 : 0)` on top of the first definition only.
2. **"Profile mismatch", two definitions.**
   `useOpportunitiesFeed.ts:393` counts `enriched.filter(opp => isNotEligible(opp))`
   (matchScore/eligibility); `filterOpportunities.ts:267-276`
   (`applyProfileVisibility`) filters on `matchesProfileFilters`
   (city/mode/batch chips). **The feed's own list does not apply
   `applyProfileVisibility`** (comment at `useOpportunitiesFeed.ts:388-391`), but
   the mobile sheet's draft counter **does** (`useCategoryPageState.ts:961-965`).
   So the number on the Apply button and the number of rows the user gets after
   Apply are produced by two different rules.
3. **Profile-seed "owned dims" vs `profileChipCount`.**
   `useCategoryPageState.ts:367-374` computes ownership from the **URL seed**;
   `useOpportunitiesFeed.ts:534-537` reports `activeProfileChips.length` /
   `deriveProfileFilterChips(profile).length`. A dimension dismissed via a chip is
   subtracted in the second and not in the first unless
   `resetProfileFilterDims()` ran (`:358`).
4. **Passout-year rule, two implementations.**
   `useProfileFilters.ts:246-256` (now delegating to `matchesDeclaredPassoutYear`)
   vs `filterOpportunities.ts`'s own copy and `countFilterFacets:414-420`. The
   `useProfileFilters` change was clearly made to fix this — but
   `applyProfileVisibility`'s city matcher at `useProfileFilters.ts:230-243` still
   uses bidirectional substring `loc.includes(city) || city.includes(loc)`, which
   no other matcher in the file does.
5. **Feed hydration count, opposite polarity.**
   `useOpportunitiesFeed.ts:318`
   `needsHydration = !initialData || opportunities.length < (total ?? 0)` vs
   `OpportunitiesFeedClient.tsx:202`
   `isFeedPending = !!(initialData && opportunities.length < (total ?? 0))` —
   the client version reports "not pending" when there is **no** `initialData`,
   which is exactly the case where the feed *is* loading.
6. **`type` derivation from `?type=`, three parsers.**
   `useCategoryPageState.ts:100-103` uppercases the raw param;
   `OpportunitiesFeedClient.tsx:33-39` runs a slug map;
   `useOpportunityForm.ts:235-245` runs a third map via `typeParamToEnum`.
7. **Page-size constant bypassed.** `FEED_PAGE_SIZE` is imported at
   `useCategoryPageState.ts:26`, but `useCategoryPageState.ts:443` and
   `CategoryPageView.tsx:276` use a **literal `20`**.
8. **Saved-job write path merges differently.**
   `useSavedJobs.ts:175` reads the module store (`:166`) —
   `{...currentLocal, ...sharedSavedJobsMap, ...remoteVal}` — while
   `useFirebaseTracker.ts:129` does
   `{...getLocalTracker(), ...prev, ...remoteVal}`. **A card save and a tracker
   save resolve to different merges.**
