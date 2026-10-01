# Audit 06 — Design system conformance and accessibility

Read-only. Scope: `apps/web/src/ui` (63 `.tsx`), `apps/web/src/features`
(233 `.tsx`), `globals.css`, `DESIGN_SYSTEM.md`.

**`apps/web/src/components` is empty** — the directory exists, zero files.

---

## 1. Token violations

Counts are line-level matches in `src/ui` + `src/features` unless noted.

| Token class | Count | Worst offenders |
|---|---|---|
| `outline-none` (any variant) | **154** (`focus:outline-none` 49) | `globals.css:152` nukes focus rings **globally**; `ui/ThemeSwitcher.tsx:93,98,103,113`; `ui/data-grid/DataGridToolbar.tsx:18,41`; `notifications/NotificationsDropdown.tsx:137`; `resources/ResourcePageView.tsx:229,236,244` |
| Arbitrary px/rem `-[Npx]` | 28 in `ui`, **66** in `features` | `shell/ErrorState.tsx:33` `text-[7rem]`; `jobs/SkillPill.tsx:129` `h-[26px]`; the landing set repeats `px-[18px] py-[10px] text-[13.5px]` at `HeroSection.tsx:71,78,85`, `StatementBand.tsx:29,35`, `UPageClient.tsx:138,312`, `LatestJobsList.tsx:119` — **despite `ui/BrandButton.tsx:44` owning exactly that scale** |
| `bg-black/*`, `text-white`, `slate/zinc/neutral/gray` | 13 | `ui/Dialog.tsx:24`, `ui/Sheet.tsx:24`, `ui/drawer.tsx:35`, `ui/ResponsivePopover.tsx:57`; `admin/opportunities/statuses.tsx:48`, `admin/discovery/statuses.tsx:45,46` `text-zinc-600` — **`DESIGN_SYSTEM.md:260` bans `slate/zinc/gray/stone`** |
| Literal hex / rgba in TSX | 63 app-wide, 2 in `ui` | `ui/SidebarVariantPicker.tsx:98,117` `stroke="#fff"`/`fill="#fff"`; `landing/LiveStatsBox.tsx:59,60` `bg-[#10b981]` ×2 — **token `--color-success` exists at `globals.css:54`** |
| `max-w-[1120px]` landing shell | 9 sites | `HeroSection.tsx:42`, `CompanyRegister.tsx:21`, `BoardsSection.tsx:27`, `ComparisonSection.tsx:26`, `ProofSection.tsx:27`, `StatementBand.tsx:15`, `StatBand.tsx:26`, `UPageClient.tsx:97,174,244` — `globals.css:1086-1124` declares an `@utility` for exactly this |
| Arbitrary `ease-[cubic-bezier(…)]` | 2 | `ui/EmptyState.tsx:42,43` while `--ease-out-strong` exists at `globals.css:17` |

`globals.css` itself hardcodes outside `@theme`: `#e2eaf2` (`:297`, also
`ThemeContext.tsx:6`), `#0d0f14` (`:304`, also `ThemeContext.tsx:7`),
`#0e1420/#151d2e/#2a3448/#eef1f6/#8b93a5` (`:586-590`, `:716-733`),
`#059669`/`#10b981` (`:981,986,1058`) where `--color-success` exists.

---

## 2. `packages/ui` adoption

`apps/web` imports `@repo/ui` **39 times — 36 are `cn` only.** Real component
adoption: `Timeline` ×1 (`GovernmentJobDetailView.tsx:31`), `Tabs` ×1 (same file
`:37`), `sanitizeHtml` ×1 (`DescriptionSection.tsx:2`). **Everything else is
hand-rolled.**

| Export | Hand-rolled equivalents |
|---|---|
| `Button` | **411 raw `<button>`**, 61 styled as CTAs without `<Button>`. Top: `landing/HeroSection.tsx:71,78,85`; `admin/CaptionsTool.tsx` (dozens, e.g. `:848,1395`); `admin/opportunities/columns.tsx:324`; `admin/discovery/TargetCompaniesTab.tsx:172` |
| `Card` | **80** `div` frames with `bg-card`+`border` |
| `Badge` | `jobs/SkillPill.tsx:118-129`, `JobCard/AutoFitBadges.tsx`, `JobCard/JobCardBadges.tsx:9,16`, `admin/discovery/DashboardTab.tsx:106-107`, `moderation/CommunitySubmissionsQueue.tsx:318,323` |
| `Input` | **174 raw `<input>`**, 294 `placeholder=` props; `admin/ui/SmartInput.tsx` reimplements the wrapper |
| `CompanyLogo` | **duplicate of the package component** — `features/companies/components/CompanyLogo.tsx:24` (web) vs `packages/ui/src/CompanyLogo.tsx` (235 lines) |
| `Tabs` | `ui/Tabs.tsx` (Radix) vs `packages/ui/src/components/Tabs.tsx` (button-based) — **two implementations, two visual languages** |
| `DataTable` | `ui/data-table/DataTable.tsx`, `ui/data-grid/DataGrid.tsx`, `app/dev/dashboard-01/_components/data-table.tsx:354` — **three tables** |
| `theme` | **not imported by web at all**; `globals.css:13-148` is a parallel, divergent token set |

---

## 3. Local `ui/` vs package

Same-basename collisions between `apps/web/src/ui` and `packages/ui/src`:
**Badge, Button, Card, Input, Tabs, DataTable** — all independently implemented,
divergent markup and variants (e.g. `ui/Badge.tsx:44` renders a `<div>`;
`packages/ui/src/Badge.tsx` is 39 lines).

Duplicated patterns inside the app:

| Pattern | Sites |
|---|---|
| **StatCard ×3** | `ui/StatCard.tsx:35`; `settings/ReferralTab.tsx:50`; `admin/discovery/DashboardTab.tsx:43` |
| **EmptyState ×2** | `ui/EmptyState.tsx:20`; `profile/ProfileSectionCard.tsx:96` (`SectionEmptyState`) |
| **DropdownMenu ×2** | `ui/DropdownMenu.tsx` (rounded-xl, `bg-card`, custom) vs `ui/dropdown-menu.tsx` (rounded-md, stock shadcn) — divergent classes at lines 50/68 of each |
| **Pagination ×2** | `ui/data-table/DataTablePagination.tsx` vs `ui/data-grid/data-grid-pagination.tsx` (both `Go to previous page`) |
| **Tabs ×3** | `ui/Tabs.tsx`, `packages/ui/src/components/Tabs.tsx`, `dashboard/DashboardTabs.tsx:17` |

---

## 4. Accessibility — interactive elements

**`<div>`/`<span>` with `onClick`, no role, no keyboard handler: 7.**
`dashboard/DashboardClient.tsx:68,82,96,110,124` — **five navigation "cards"**
(`router.push`) reachable by mouse only. Plus `admin/CaptionsTool.tsx:1031` and
`admin/opportunities/AdminOpportunityPreviewModal.tsx:65`.

**`<button>` with no accessible name (icon-only, no `aria-label`, no `sr-only`): 23.**

`ui/Tooltip.tsx:37`; `auth/AuthModal.tsx:449`;
`jobs/MobileFilterDrawer.tsx:105,130`; `jobs/JobFilterBar.tsx:109`;
`jobs/detail/GovernmentJobDetailView.tsx:838,942`;
`jobs/detail/OpportunityDetailClient.tsx:279`; `jobs/WalkinMap/MapFilterHeader.tsx:121`;
`jobs/post/PostJobForm.tsx:388`; `jobs/tabs/AppliedTab.tsx:389`;
`admin/discovery/DiscoveredJobsTab.tsx:248`, `DiscoveryHeader.tsx:152`,
`ProcessedJobsTab.tsx:370`, `TargetCompaniesTab.tsx:172`;
`admin/opportunities/SocialStatusSection.tsx:40`;
`community/ReferralBoardClient.tsx:187`, `SalaryReportsClient.tsx:70`;
`profile/PublicProfileClient.tsx:373`;
`settings/AccountTab.tsx:384`, `FeedbackTab.tsx:265`, `ReferralTab.tsx:240`.

**`<img>` without `alt`: 1 real gap.** `rooms/RoomDetail.tsx:215` and
`rooms/RoomMembers.tsx:67` use `alt=""` (decorative, acceptable). `app/opengraph-image.tsx:74`
and the `app/dev/*` routes lack `alt`.

---

## 5. Semantics and ARIA

**`aria-expanded` with no `aria-controls`: 26 of 27.** Only
`admin/AdminResourcesClient.tsx:296` pairs them.

Unpaired: `jobs/JobFilterBar.tsx:531,596,722,756,795,842,903,963,997,1041,1104,1168`
(12); `jobs/JobsFilterBar.tsx:273,324,348,376,408,439,468` (7);
`navigation/NavMegaMenu.tsx:107`; `profile/EducationSection.tsx:363`;
`jobs/OpportunitiesFeedClient.tsx:393`; `resources/ResourcePageView.tsx:172`;
`profile/ProfileStrengthCard.tsx:136`; `jobs/discussion/DiscussionSection.tsx:76`.

**`role="tablist"` without `role="tab"` siblings or `aria-selected`:**
`dashboard/DashboardTabs.tsx:24,28` has `role="tab"` but no `aria-controls`/panel
id; `jobs/tabs/NotificationsTab.tsx:149,156`; `admin/login/LoginClient.tsx:300,310`.

**Hand-rolled modals with no `role="dialog"`, no `aria-modal`, no labelling, no
focus trap, no Escape, no focus restore:**
`admin/discovery/DiscoveryWorkspace.tsx:331`; `auth/AuthDialog.tsx:31`;
`admin/opportunities/AdminOpportunityPreviewModal.tsx:64`;
`admin/CaptionsTool.tsx:1375,1560,1631`;
`jobs/OpportunitiesFeedClient.tsx:524`; `jobs/ProgrammaticHub.tsx:208,265`.

**Only the Radix-backed `ui/Dialog.tsx` / `AuthModal.tsx` satisfy this**
(AuthModal documents it at `:105`).

**Live regions: only 14 `aria-live`/`role="status"` app-wide.**
`jobs/OpportunitiesFeedClient.tsx:382` and `OpportunityGrid.tsx:45` have them.
Most async result areas have none.

**`tabIndex` above 0: none found.** `tabIndex={-1}` at
`onboarding-content.tsx:389` is correct usage.

---

## 6. Focus and keyboard

**There is no skip link anywhere** in `src/ui` or `src/features` — confirmed by
grep for `skip` / `Skip to`.

### The global focus-ring removal

`globals.css:152` applies `focus-visible:outline-none focus-visible:ring-0` to
`*`, so every element only shows a ring if it re-adds one. Replacements are
inconsistent — `focus:outline-none` (not `focus-visible:`) at
`ui/AlertDialog.tsx:73`, `ui/Sheet.tsx:78`, `ui/data-grid/DataGridToolbar.tsx:18,41`,
`notifications/NotificationsDropdown.tsx:137`, `jobs/AlertsTab.tsx:192,209`,
`navigation/MobileTopNav.tsx:160`, `navigation/TopUtilityBar.tsx:65`,
`resources/ResourcePageView.tsx:229,236,244`, `ui/ThemeSwitcher.tsx:93,98,103,113`.

**Keyboard focus is silently removed with no replacement on all of these.**

### Press feedback asymmetry

88 `active:scale*` sites. `ui/Button.tsx:18` pairs it with
`motion-reduce:transform-none`, but the hand-rolled ones mostly do **not** —
`navigation/MobileTopNav.tsx:133,140,160`, `TopUtilityBar.tsx:65`,
`DesktopNav.tsx:78,106,132,139`, `SiteHeader.tsx:112,119`,
`ui/ThemeSwitcher.tsx:113`, `admin/opportunities/columns.tsx:324`,
`admin/discovery/TargetCompaniesTab.tsx:172`.

**Keyboard activation gets no scale feedback and no reduced-motion escape.**

### Dropdown Escape handling

Handled: `JobsFilterBar.tsx:136`, `JobFilterBar.tsx:498`,
`MobileFilterDrawer.tsx:198`, `NavMegaMenu.tsx:110`.
**Missing:** `profile/SocialLinksSection.tsx:499`, `profile/SkillsSection.tsx:127`,
`community/CommentThread.tsx:113`, `community/RoomPosts.tsx:139` — all have
`onKeyDown` without Escape.

**Focus restore: no `onCloseAutoFocus` handling and no trigger-ref refocus** in
the hand-rolled dropdowns. `JobFilterBar.tsx:129-145` refs exist for
click-outside only.

---

## 7. Contrast and colour-only meaning

Computed from the `globals.css` token values (OKLCH → sRGB):

| Pair | Ratio | Verdict |
|---|---|---|
| Light `text-warning` (`:56`) on card / on `bg-warning/15` | **2.27:1 / 2.04:1** | fails 4.5:1 |
| Light `text-success` (`:54`) on card / `bg-success/15` | **3.53:1 / 2.98:1** | fails |
| Light `text-error` (`:55`) on `bg-error/15` | **3.54:1** | fails |
| Light `--color-signal-heat` (`:65`) | **3.02:1** | fails |
| Light `--color-border` (`:42`) vs `--color-background` (`:31`) | **1.53:1** | fails 3:1 non-text |
| Dark `--color-border` (`:214`) vs `--color-card` (`:199`) | **1.24:1** | fails 3:1 non-text |
| `::placeholder` = muted-fg @ 0.75 (`:356`) on `--color-background` | **1.85:1** | fails |
| `text-muted-foreground/60` usages | ~3.69:1 | fails |

**Dark-mode equivalents for warning/success/error all pass** (10.1 / 6.7 / 5.9).
This is a light-mode-only problem.

**Colour-only status — mostly fine.** `admin/discovery/DashboardTab.tsx:106-107`,
`jobs/detail/OpportunityDetailPane.tsx:242,250` and `DetailHeroSection.tsx:80` all
pair the coloured dot with text. `ui/Badge.tsx:20-25` uses colour +
`capitalize` text.

**One real case:** `notifications/NotificationsDropdown.tsx:144` — the unread dot
is `bg-primary` with **no** text or shape alternative beyond the count badge at
`:156`.

**Placeholder-as-label: 3 inputs** with `placeholder` and no `id`/`aria-label` —
`admin/CaptionsTool.tsx:840`, `companies/FollowedCompaniesPanel.tsx:107`,
`jobs/detail/GovernmentJobDetailView.tsx:248`.

---

## 8. Loading feedback

Most buttons do guard. Gaps — an async action with no pending state, so the user
can double-submit: `community/ReferralBoardClient.tsx:188` (`type="submit"` with
no pending flag, unlike its sibling `SalaryReportsClient.tsx:70` which has
`disabled={submitting}`); `jobs/post/PostJobForm.tsx:389`;
`admin/opportunities/OpportunityFormPage.tsx:311`; `admin/PushNotificationClient.tsx:138`;
`profile/UPageClient.tsx:137,311`; `settings/FeedbackTab.tsx:266`.

**Skeleton geometry mismatches** — same feed surface, three different heights:
`community/SalaryReportsClient.tsx:130` (`h-28 rounded-2xl`) vs
`ReferralBoardClient.tsx:144` (`h-24 rounded-2xl`) vs
`CommunityFeedClient.tsx:303` (`h-32 rounded-2xl`).

`companies/FollowedCompaniesPanel.tsx:76` (`h-14 rounded-xl`) vs
`settings/ReferralTab.tsx:301` (`h-14` **unrounded**);
`ReferralTab.tsx:196` (`h-10 rounded-xl`) vs `SocialLinksSection.tsx:433`
(`h-10 rounded-lg`) for the same input-row height.

---

## 9. Reduced motion

`prefers-reduced-motion` appears in **`globals.css` only** — six blocks at
`:312,614,702,779,1025,1258`, covering marquee, overlay motion, hero lines,
fade-up, pin-in/word-reveal, collapsible. Everything else is Tailwind-gated:
`motion-reduce:*` appears in **24 places across 296 scoped files**.

**Unconditional animations/entrances** — no `motion-reduce:*`, violating
`DESIGN_SYSTEM.md:388`:

`ui/EmptyState.tsx:42,43`; `ui/Tooltip.tsx:24`; `ui/Sheet.tsx:24,39`;
`ui/ResponsivePopover.tsx:99`; `ui/Select.tsx:101`; `ui/dropdown-menu.tsx:50,68`;
`ui/Command.tsx:47,118`; `ui/Tabs.tsx:32,47`; `auth/AuthShell.tsx:27`,
`AuthDialog.tsx:31`, `AuthModal.tsx:88`;
`jobs/OpportunitiesFeedClient.tsx:524`, `ProgrammaticHub.tsx:208,265`,
`SavedTab.tsx:168`, `detail/ExpiredWarning.tsx:20`;
`admin/opportunities/AdminOpportunityPreviewModal.tsx:64,67`;
`admin/CaptionsTool.tsx:793,980,1379,1564,1639`;
`admin/discovery/DiscoveryWorkspace.tsx:281`; `admin/TwoFactorSetup.tsx:145`;
`settings/ReferralTab.tsx:165`, `FeedbackTab.tsx:126`;
`jobs/JobsFilterBar.tsx:241`, `CategoryPageView.tsx:1179`;

**plus ~40 `animate-spin` loaders that never disable.**

---

## 10. Duplicated component patterns

| Pattern | Sites |
|---|---|
| Badge / pill / chip | `ui/Badge.tsx:5` (cva) · `jobs/SkillPill.tsx:118` · `jobs/MobileFilterDrawer.tsx:118` (`Pill`) · `jobs/PageTagLinks.tsx` · `jobs/tabs/SearchesTab.tsx:96` · `ui/Button.tsx` `size="chip"` |
| Dropdown menu | `ui/DropdownMenu.tsx` · `ui/dropdown-menu.tsx` · `ui/Command.tsx` · `ui/data-grid/FilterSelect.tsx` · `admin/AdminResourcesClient.tsx:180-330` (hand-built combobox) |
| Card frame | `ui/Card.tsx` · `packages/ui/src/Card.tsx` · 80 inline `bg-card`+`border` divs |
| Empty state | `ui/EmptyState.tsx:20` · `profile/ProfileSectionCard.tsx:96` · `jobs/SavedTab.tsx:168` · inline `<p>No … found</p>` at `JobFilterBar.tsx:705,889,950,1152`, `JobsFilterBar.tsx:456,491`, `MobileFilterDrawer.tsx:533` |
| Pagination | `ui/data-table/DataTablePagination.tsx` · `ui/data-grid/data-grid-pagination.tsx` · `app/dev/dashboard-01/_components/data-table.tsx:604-617` |
| Tabs | `ui/Tabs.tsx:8` · `packages/ui/src/components/Tabs.tsx:17` · `dashboard/DashboardTabs.tsx:24` · `jobs/NotificationsTab.tsx:149` · `community/CommunityTabsClient.tsx` · `resources/ResourcesTabsClient.tsx` · `settings/SettingsTabsClient.tsx` |
| Stat tile | `ui/StatCard.tsx:35` · `settings/ReferralTab.tsx:50` · `admin/discovery/DashboardTab.tsx:43` |
| Data table | `ui/data-table/DataTable.tsx:65` · `ui/data-grid/DataGrid.tsx` · `app/dev/dashboard-01/_components/data-table.tsx:354` |
| Icon wrapper | `ui/chart.tsx:55` · `ui/sidebar.tsx:554,628` · `globals.css:419-424` (`svg.icon`, `.feature-icon svg`) |
