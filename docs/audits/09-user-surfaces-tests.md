# Audit 09 — End-user surfaces and test coverage

Read-only. Note: the worktree was dirty during this audit, so lines reflect read
time.

---

## 1. User surface inventory

Tab shell: `jobs/components/JobsPageClient.tsx:29-35` declares 7 tabs;
`TAB_COMPONENTS` at `:42-48` maps 6 (Following is special-cased at `:111-122`).

| Tab | File | Loading | Error | Empty |
|---|---|---|---|---|
| For You | `jobs/tabs/ForYouTab.tsx` | yes `:120-129` | yes `ErrorMessage` `:130-136` | yes `EmptyState` `:137-150` |
| Saved | `jobs/tabs/SavedTab.tsx` | yes `:157-177` | **no** — catch only `console.error` `:52-54` | yes `:178-200` |
| Applied | `jobs/tabs/AppliedTab.tsx` | yes `SkeletonTrackerTable` `:311` | **no** — catch only `console.error` `:114-116` | yes `EmptyState` `:317-328` |
| Notifications | `jobs/tabs/NotificationsTab.tsx` | yes `:206-216` | **no** — deliberate, documented `:57-60` | yes `:217-258` (2 variants) |
| Alerts | `jobs/tabs/AlertsTab.tsx` | yes `:255-256` | toast only `:248` | n/a (form) |
| Searches | `jobs/tabs/SearchesTab.tsx` | yes `:208` | yes `ErrorMessage` `:252-258` | yes `:217`, `:261` |
| Following | `companies/components/FollowingTab.tsx` | — | — | — |

Other signed-in surfaces: `dashboard/DashboardClient.tsx` (loading `:432-439`,
error banner `:404-409`, empty via per-section `length > 0` guards),
`profile/ProfileEditor.tsx`, `profile/public/*`,
`settings/tabs/{Account,Appearance,Referral,Feedback}Tab.tsx`,
`notifications/NotificationsDropdown.tsx` (loading `:177-185`, empty `:186-192`,
**no error branch** — `Promise.allSettled` swallows at `:45-63`).

**Correct:** ForYou, Searches, the notifications dropdown, and the Dashboard all
have all three states.

---

## 2. Saved and applied surfaces

`features/saved/` **does not exist.** Saved lives at `jobs/tabs/SavedTab.tsx` +
`dashboard/hooks/useSavedJobs.ts`.

### `actionType` → label: FOUR independent tables, and they disagree

| Concept | A — detail page | B — tracker tab | C — card badge | D — current value |
|---|---|---|---|---|
| | `packages/utils/src/opportunity/display.ts:328-335` `getTrackerOptions` | `AppliedTab.tsx:40-65` `STATUS_CONFIGS` | `jobs/domain/trackerState.ts:8-15` `PIPELINE_ACTION_TYPES` | `display.ts:320-326` `getCurrentActionType` |
| SELECTED / OFFERED | **"Selected"** | **"Offered"** | `OFFERED` | — |
| INTERVIEWED / ATTENDED | "Interviewed" (**"Attended"** if walkin) | **"Interviewing"** | `INTERVIEWING` | — |
| REJECTED | **absent** | "Rejected" | `REJECTED` | — |
| APPLIED | present unless walkin | present | `APPLIED` | — |
| PLANNED | — | "Planned" | `PLANNED` | — |
| SAVED | — | "Saved" | `SAVED_FOR_LATER` | — |

**Same user action, same listing, three names.** A user who sets "Offered" in the
tracker sees "Selected" on the detail page. `REJECTED` is reachable from B but has
no option in A, so a rejected listing shows a value the detail select **cannot
represent**.

### Status normalisation: two functions

- `AppliedTab.tsx:77-83` `normalizeStatus` — 5 branches, defaults to `APPLIED`,
  also maps `'OFFERED'→SELECTED`
- `display.ts:320-326` `getCurrentActionType` — 3 branches, **no
  `OFFERED`/`REJECTED` handling, no `SAVED`**

### Card rendering

**`SavedJobCard` is correctly shared** — imported by `SavedTab.tsx:19` and
`app/(public)/companies/[slug]/_components/CompanyRoleCard.tsx:6,24`. The company
page does **not** hand-build a second card. **Keep this.**

The **unavailable-listing row** (`SavedTab.tsx:212-243`) is a hand-built sibling,
duplicating the bookmark-toggle and remove affordance.

### Empty states — three treatments across four tabs

`SavedTab.tsx:179-200` hand-builds a bordered panel with inline SVG;
`AppliedTab.tsx:317-328` and `ForYouTab.tsx:138` use the shared `EmptyState`;
`NotificationsTab.tsx:218-258` hand-builds a dashed panel again.

### `timeAgo` — 4 live implementations

`SavedTab.tsx:21-30` (days/months) · `notifications/notificationItems.ts:247-261`
(mins/hours/days/date) · `landing/LatestJobsList.tsx:31-37` (uppercase `M/H/YDA/D
AGO`) · `community/ReferralBoardClient.tsx` · `jobs/CompanyHubIntel.tsx`.

**`SavedTab.tsx:21` is defined and never called — dead code.**

---

## 3. Dashboard

`DashboardClient.tsx` re-implements feed rendering independently rather than
reusing `useOpportunitiesFeed` (which `ForYouTab.tsx:39` does use).

- **Duplicated feed fetch** — `DashboardClient.tsx:180` calls `fetchFeedIndex()`
  and writes cache `'type:all'` at `:190`; `SavedTab.tsx:45` and
  `AppliedTab.tsx:107` each independently call the same. `SavedTab.tsx:48-50` and
  `AppliedTab.tsx:110-112` are **byte-identical merge logic in two files**.
- **Duplicated aggregation** — `dataStreams` `:244-370` derives 9 streams.
  `calculateOpportunityMatch` is called per card at `:252` for all 60 items, then
  only `recommended` (6) is used — **54 wasted computations per recompute.**
- **Per-card repeated work** — `hasAppliedAction(opp)` (`:51-54`) is called inline
  in **9 separate `.map()` bodies** (`:458,490,515,539,595,620,645,670,695`), each
  doing a fresh `.some()` with an array literal allocation.
- **Ad-hoc classification duplicating `walkinMapUtils`** — off-campus `:302-313`,
  walk-in `:318-325`, government `:330-342`, hackathon `:347-355` each re-do
  `isWalkinOpportunity`/`isGovernmentOpportunity` **plus raw
  `title.includes(...)` string sniffing**.

**`DashboardFeed.tsx` is dead** — no importer found.

---

## 4. Profile

- **Exact duplicate function:** `profile/profileChecklist.ts:112-116`
  `getProfileGaps` and `profile/profileGaps.ts:14-18` `getProfileGaps` are the
  same function. The only consumer, `settings/AccountOverview.tsx:9`, imports from
  `profileChecklist`. **`profileGaps.ts` is orphaned.**
- **Dead constant map causing broken output:**
  `profile/preferences.ts:12-16` `OPPORTUNITY_LABELS` maps
  `JOB`/`INTERNSHIP`/`WALKIN`, but `OPPORTUNITY_TYPES`
  (`profileConstants.ts:26-32`) now holds `OpportunityCategory.*` values
  (`EMPLOYMENT`, `COMPETITION`, `SCHOLARSHIP`, `EDUCATION`, `EVENT`) — the comment
  at `profileConstants.ts:24-25` says exactly this.
  **So `formatOpportunityType` (`:25-27`) never matches and always falls through
  to the title-case branch**, rendering "Employment"/"Scholarship" instead of
  "Jobs". `formatOpportunityType` has no callers.
- **Duplicated work-mode formatter — three strings for one concept:**
  `preferences.ts:18-22` → "On-site"; `JobCard/JobCardMetaConfig.ts:38-45` →
  **"Onsite"**; `OpportunityRow.tsx:26-28` → **"On-site"**.
  `JobCardMetaConfig.ts:41` also accepts `'in office'`/`'in-office'`; the others
  do not.
- **Two completion scores that can differ — this one is intentional.**
  `ProfileStrengthCard.tsx:41-42` computes `Math.round(done/total*100)` from a
  9-item checklist; `DashboardClient.tsx:144`, `PublicPageStatusBanner.tsx:25`,
  `DashboardBanners.tsx:19` use `calculateProfileCompletion(…).percentage`. The
  comment at `ProfileStrengthCard.tsx:19-25` documents this deliberately.
  **Flagged so it is not "fixed".**
- **Field saved in two places:** public page URL/boost state is written by
  `usePublicPageActivation` from both `AccountOverview.tsx:123` and the editor's
  `ProfilePreviewCard` — **single shared hook, correct.**

---

## 5. Notifications

**One mapping — correct.** `notifications/notificationItems.ts` is the single
source: `alertKindLabel` `:63-79`, `toAlertItem` `:81-114`,
`toNotificationItem` `:124-245`. Both consumers
(`NotificationsTab.tsx:19-27`, `NotificationsDropdown.tsx:15-22`) import the same
functions. **Neither re-implements.**

- **Unhandled types:** the `default` branch `:205-216` catches any `NotificationType`
  not enumerated. All 16 known types are handled above it (`:133-204`), so
  reaching it means a value `packages/types` does not know. The user sees
  "Update on {title}" or "New activity" — the comment at `:206-212` records this
  was a deliberate fix for exactly this failure.
- **Silent alert failure:** `NotificationsTab.tsx:51-53` swallows
  `alertsApi.getFeed` failure with no user signal. A user with only alerts
  configured sees "No notifications yet."
- **Error state intentionally absent** — documented at `:57-60`.

---

## 6. Company and programmatic SEO pages

- **Directory** `CompaniesDirectoryClient.tsx` — hand-built rows `:269-288`
  (logo + name + count), distinct from any shared card
- **Company page** `companies/[slug]/_components/CompanyRoleCard.tsx:24` —
  **correctly delegates to `SavedJobCard`**
- **City page** `drives/walk-in/[city]/page.tsx` — **two more hand-built listing
  shapes**: "next three" cards `:190-214` (logo/title/company/date) and the full
  list rows `:226-265` (logo/title/company+venue+time/date). **Neither is
  `SavedJobCard`, `OpportunityRow`, nor `JobCard`.**
- **`ProgrammaticHub.tsx` is unreferenced** — no importer in `apps/web` or
  `packages` (verified via `git grep`). **280 lines of dead SEO surface.** It also
  contains a genuine duplicate: the mobile detail modal is rendered twice, inline
  at `:207-220` and again in the fragment tail at `:264-277` — **same
  `id="mobile-detail-modal"`, so when both conditions hold two elements share one
  DOM id.**

### Divergence in how "roles at company X" is counted

- `/companies` and `/companies/{slug}` **agree** — both use `CompanySlugger` +
  `mergeByWebsite` (`companyDirectory.ts:26-88,98-134`)
- The dashboard does **not** — `DashboardClient.tsx:281` keys trending companies
  on `o.company.trim()` raw. **A company split across two logo domains gets two
  dashboard rows with split counts, one directory row with a summed count, and
  one company page.**
- The city page uses its own slugger (`replace(/\s+/g,'-')` at `:33`) unrelated
  to `CompanySlugger`

---

## 7. Landing page

- **`LatestJobsList.tsx` is a fourth job-row implementation** — own `stampFor`
  `:17-29` (LIVE/AGING with inline `color-mix` tokens), own `timeAgo` `:31-37`,
  own card grid `:56-107`. It **does** correctly reuse `toSafeOutboundUrl` `:53`
  and `CommentCountsProvider` `:128`.
- Its `timeAgo` is `Date.now()` per row at `:32` — **recomputed on every render
  for every row, no memo** — and disagrees with the app's own `getPostedLabel`
  (`jobCardUtils.ts`) used by `SavedJobCard.tsx:63` and `OpportunityRow.tsx:52`.
- **`LiveStatsBox.tsx:36` uses a raw `fetch`** to
  `${NEXT_PUBLIC_API_URL}/api/stats` instead of an API-client wrapper,
  contradicting `apps/web/AGENTS.md` ("Never add raw `fetch` calls in UI components
  when an API client wrapper exists"). Its fallback is an em-dash, not fake
  numbers — **correct**.
- `BoardsSection.tsx` is data-driven from props (`BoardsData` `:10-15`) —
  **correct, no hardcoded counts.**
- **`LiveStatsBox.tsx:87` labels Cloudflare `yesterday.visitors` as "Freshers
  yesterday"** — a visitor metric presented as a candidate metric.

---

## 8. Test coverage — what exists

**Three test files. All Playwright e2e smoke. Zero unit tests.**

| File | Covers | Asserts behaviour? |
|---|---|---|
| `tests/smoke/smoke.spec.ts` | login heading; `/dashboard` unauth redirect; detail route reachability; `/admin/opportunities` redirect | Routing only. `:18` `toHaveURL(/\/(opportunities\|login)/)` is **near-vacuous** — it passes on a crash-to-login |
| `tests/smoke/admin-telegram-panel.spec.ts` | 4 buttons render on `/admin/telegram` | Render-only. **Skipped** unless `ADMIN_STORAGE_STATE` is set (`:6`) |
| `tests/smoke/admin-create-from-json.spec.ts` | JSON autofill → publish → appears in admin → edit page | **Genuine behaviour.** Skipped without `ADMIN_STORAGE_STATE` (`:6`), i.e. in default CI |

**Nothing under `tests/` touches `features/`.**

### Most important untested logic

Pure, branching, zero coverage — in rough priority order:

1. `AppliedTab.tsx:77-83` `normalizeStatus` — 5 branches, **feeds the entire tracker**
2. `packages/utils/…/display.ts:328-335` `getTrackerOptions` — walkin branching,
   plus the A/B label divergence in §2
3. `packages/utils/…/display.ts:320-326` `getCurrentActionType` — the legacy remap
4. `notificationItems.ts:132-217` `toNotificationItem` — **16-case switch** +
   `submissionPublished` override `:224-228` + `fallbackHref` `:239-243`
5. `notificationItems.ts:63-79` `alertKindLabel`; `:247-261` `timeAgo`;
   `:263-286` `groupByDay` (today/yesterday/older boundaries)
6. `trackerState.ts:26-32,41-43` `getPipelineActionType` / `resolveShowApplied`
7. `profileChecklist.ts:29-99` `getProfileChecklist` — 9 predicates;
   `countChecklist`; `getProfileGaps`
8. `profileSummary.ts:50-82` `describePageState` — 4 states, `daysLeft`
   pluralisation `:65,75`
9. `profile/preferences.ts:25-31` formatters (**currently broken**, §4);
   `:50-52` `toggleValue`
10. `companies/utils/companyDirectory.ts:98-134` `mergeByWebsite` — host merge,
    `>` vs `>=` at `:125`; `:26-88` `aggregateCompanies`
11. `CompaniesDirectoryClient.tsx:40-48` `inRoleBucket` — the `>10` vs `>=10` edge
12. `OpportunityRow.tsx:24-33` `getModeLabel`; `:35-39` `getTypePrefix`
13. `JobCardMetaConfig.ts:38-45` `formatWorkMode`; `:54-186` `buildMetaItems`
    (3 branches, cap at `:186`)
14. `SavedTab.tsx:64-103` memo — the
    `unavailable.filter(() => 'unavailable listing'.includes(query))` at `:94` is
    **a constant predicate, always `false`** unless the query is a substring
15. `LatestJobsList.tsx:17-29` `stampFor` (2-day LIVE boundary); `:31-37`
    `timeAgo` (the `h < 48` "YDA" branch)

---

## 9. Test infrastructure

- **Runner: Playwright only** — `playwright.config.ts`, `testDir: './tests/smoke'`
  `:7`. Only script: `test:smoke` (`package.json:17`).
- **No unit/component runner.** No `vitest`, `jest`, `@testing-library/*`, `jsdom`,
  or `happy-dom` in `package.json:91-101`. **Component tests cannot render.**
- **No setup file, no fixtures, no global config, no coverage provider.**
- **Zero data-layer mocking** — because no unit runner exists.
  `reuseExistingServer: true` `:21` + `webServer` `:16-21` means tests hit a real
  `next dev` on a **live CDN feed**.
- `retries: 0` `:10` and `trace: 'on-first-retry'` `:14` — **traces are never
  captured, since there are no retries. Effectively dead config.**
- **Brittle-by-construction tests:**
  `admin-create-from-json.spec.ts:40` selects
  `textarea[placeholder*="WALKIN"][placeholder*="title"]` — breaks on any
  placeholder copy edit. `:51`
  `page.locator('tr, article, div', { hasText: title }).first()` — a three-way CSS
  guess. `:44-45,59-60` assert on `input[value="…"]`, which depends on the
  component being uncontrolled. `smoke.spec.ts:5` matches a heading by regex
  `/sign in/i`. **None assert on class names, and no snapshots are used — that is
  correct.**
- **The two most valuable specs self-skip by default** (`:6` in both), so default
  `pnpm test:smoke` runs 4 assertions, all routing.

---

## 10. Cross-surface inconsistency

1. **Status naming, 3 ways** — "Selected" (`display.ts:333`) vs **"Offered"**
   (`AppliedTab.tsx:55`) vs `OFFERED` (`trackerState.ts:13`)
2. **Interview stage, 3 ways** — "Interviewed"/"Attended" (`display.ts:332`) vs
   **"Interviewing"** (`AppliedTab.tsx:52,71`) vs `INTERVIEWING`
   (`trackerState.ts:12`)
3. **Work mode** — "On-site" (`preferences.ts:19`, `OpportunityRow.tsx:28`) vs
   **"Onsite"** (`JobCardMetaConfig.ts:41`)
4. **Dashboard "Interviews" count ≠ tracker "Interviewing" tab count.**
   `DashboardClient.tsx:396` counts `['INTERVIEWED','SHORTLISTED','ASSESSMENT']`;
   `AppliedTab.tsx:199` counts only normalised `ActionType.INTERVIEWED`. The
   dashboard also counts raw statuses `normalizeStatus` would map elsewhere.
5. **Dashboard "Applied" is not Applied.** `DashboardClient.tsx:89` labels
   `Object.keys(trackerMap).length` as "Applied" (`:395`) — that is **every
   tracker row including REJECTED and PLANNED.** The tracker tab's count
   (`AppliedTab.tsx:198`) is only normalised `APPLIED`.
6. **"N match you" vs the Matched badge** — `ForYouTab.tsx:80` counts
   `matchScore > 0`; the per-card badge `:163` uses the same `> 0`.
   **Consistent — correct.**
7. **Saved counts** — `SavedTab.tsx:118-124` splits saved/unavailable and says so
   explicitly (`:115-116`); the dashboard "Saved" tile (`:75-76`) counts
   `Object.keys(savedJobsMap).filter(truthy)` with **no unavailable split.**
   Different totals, same word.
8. **Time strings** — "2d ago" (`notificationItems.ts:256`) vs "2D AGO"
   (`LatestJobsList.tsx:36`) vs the dead `SavedTab.tsx:27` vs `getPostedLabel`
9. **Role-count semantics** — directory `co.count` is post-`mergeByWebsite` summed
   (`companyDirectory.ts:127`); dashboard `c.roleCount` is per raw company key
   (`DashboardClient.tsx:285`); city page prints `cityDrives.length` (`:223`).
   **Three counts of "roles at X" that can differ.**
10. **"Freshers yesterday"** (`LiveStatsBox.tsx:87`) is a Cloudflare visitor
    count, while the rest of the app uses "freshers" for profile candidates
11. **Empty-state idiom** — shared `EmptyState` (`AppliedTab:317`,
    `ForYouTab:138`, `SearchesTab:217`) vs two hand-built panels (`SavedTab:179`,
    `NotificationsTab:218`)
12. **Apply action label** — "Apply" (`SavedJobCard.tsx:128`) vs "Apply URL"
    (`AppliedTab.tsx:434`) vs "Apply on company site"
    (`DetailSidebarActions.tsx:149`) vs "Find similar" (`SavedTab.tsx:240`) for a
    non-apply navigation

---

## Correct as-is — explicitly

- `SavedJobCard` is genuinely shared between the saved page and company page
- Notification type→presentation mapping is single-sourced; both consumers share it
- Profile checklist vs gaps is single-sourced (`profileChecklist.ts:112` derives
  gaps) — the historical disagreement is already fixed
- Profile `%` vs checklist `x/y` is documented as intentional
  (`ProfileStrengthCard.tsx:19-25`)
- `SavedTab` unavailable-listing handling (`:64-103,211-244`) **deliberately
  refuses to fabricate a listing** — correct and explicitly reasoned
- `ForYouTab` match-count fix (`:75-81`) is a real correctness fix with a comment
  explaining the prior lie
- `toNotificationItem`'s default branch is neutral-by-design, not an oversight
- No snapshots and no class-name assertions in tests — **a real strength given the
  zero unit coverage**
