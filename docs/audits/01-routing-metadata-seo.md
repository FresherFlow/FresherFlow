# Audit 01 — App Router, routing, metadata, SEO

Read-only. Scope: `apps/web/src/app`.

---

## 1. Route inventory

| URL | File | Rendering |
|---|---|---|
| `/` | `(public)/page.tsx:18` | ISR-on-demand (`revalidate = false`) |
| `/app` | `(public)/app/page.tsx:6` | static |
| `/about /blog /contact /contribute /privacy /terms` | `(public)/*/page.tsx` | static |
| `/jobs` + `/jobs/{browse,full-time,internships,part-time,remote}` | `(public)/jobs/**/page.tsx:9-11` | ISR-on-demand |
| `/jobs/[slug]` | `(public)/jobs/[slug]/page.tsx:111,116` | ISR, `dynamicParams = true`, `generateStaticParams` `:119` |
| `/companies`, `/companies/[slug]` | `(public)/companies/**` | `revalidate = 3600`; `[slug]` bounded to 150 params `:163` |
| `/community` | `(public)/community/page.tsx` | static |
| `/community/[id]` | `(public)/community/[id]/page.tsx` | **unknown** — no segment config, no `generateStaticParams` |
| `/community/rooms/[slug]` | `:1` | `force-dynamic` |
| `/community/{referrals,rooms,salary,saved-searches}` | `page.tsx:5` each | `permanentRedirect` stubs |
| `/drives`, `/drives/off-campus`, `/drives/walk-in` | `(public)/drives/**` | ISR-on-demand |
| `/drives/walk-in/[city]` | `:13,16` | `revalidate = false`, **`dynamicParams = false`** |
| `/govt`, `/govt/[slug]` | `(public)/govt/**` | ISR-on-demand, `dynamicParams = true` |
| `/resources`, `/resources/[id]`, `/resources/{company,skill}/[id]` | `(public)/resources/**` | unknown / uncached-undefined |
| `/platforms`, `/post`, `/submit` | `page.tsx:5` / `:4` | `permanentRedirect` / `redirect` |
| `/recruiters` | `(public)/recruiters/` — **metadata in the layout** | static |
| `/u`, `/u/[username]` | `(public)/u/**` | `revalidate = 3600` / `revalidate = 60` |
| `/r/[code]` | `(public)/r/[code]/route.ts:29` | 307 handler |
| `/login /signup /join /logout /onboarding /choose-username` | `(auth)/**` | mixed; `login` `force-dynamic` `:5` |
| `/account` | `(user)/account/page.tsx:5` | `force-dynamic` |
| `/saved /settings /profile /notifications /alerts /referral /tracker /dashboard /feedback /followed-companies` | `(user)/*/page.tsx` | `permanentRedirect` stubs |
| `/admin/**` (26 pages) | `(admin)/admin/**` | per-page; 4 `force-dynamic` |
| `/moderator/**` (8 pages) | `(moderator)/moderator/**` | all 7 children `force-dynamic` |
| `/dev/**` (5 pages) | `dev/layout.tsx:3,10` | `force-dynamic` + `notFound()` in prod — **correct** |

No parallel (`@slot`) or intercept routes exist.

**Naming inconsistency:** the group is `(moderator)` but the segment is
`moderator/`, so the URL is `/moderator/*` while every group sibling follows
`(group)/<other-segment>`. See §8 — this is currently breaking.

---

## 2. Duplicated page shells

`NavigationWrapper` is mounted by **two** layouts:

```tsx
// (public)/layout.tsx:22-28
export default function PublicLayout({ children }) {
    return (<NavigationWrapper>{children}<SiteFooterGate /></NavigationWrapper>);
}
```
```tsx
// (user)/layout.tsx:5-10
export default function AccountLayout({ children }) {
    return (<NavigationWrapper><div className="w-full flex-1">{children}</div></NavigationWrapper>);
}
```

**Ten `(user)/*/layout.tsx` files are metadata-only pass-throughs** — `account`,
`alerts`, `feedback`, `followed-companies`, `profile`, `referral`, `saved`,
`settings`, `tracker` all end `return <>{children}</>;` (e.g.
`(user)/saved/layout.tsx:8-10`). They mount no chrome, so they add a layout level
for nothing.

`SiteFooterGate` (`(public)/layout.tsx:13-19`) allow-lists
`['/','/about','/blog','/careers','/contact','/privacy','/terms']` — so `/app`,
`/resources`, `/recruiters`, `/contribute` sit in the same group and silently get
no footer. **The comment at `(public)/layout.tsx:10-11` claims home "is excluded
here to avoid a duplicate", but `/` IS in the list (line 13)** and
`(public)/page.tsx:110-122` does not render its own `SiteFooter`. Comment and
code disagree.

---

## 3. Metadata and SEO duplication

**There is no shared `buildMetadata` helper.** The only reuse is
`generateOpportunityMetadata` in `features/jobs/domain/opportunitySeo.ts:191`,
consumed by exactly two routes (`jobs/[slug]/page.tsx:178`,
`govt/[slug]/page.tsx:57`). Everything else hand-builds.

### The root template double-suffixes ~10 pages

`layout.tsx:70-73` sets `template: '%s | FresherFlow'`, but these public pages
already end their title with a pipe segment, so the template appends a **second**
brand suffix:

`(public)/jobs/page.tsx:12`, `drives/page.tsx:12`, `drives/off-campus:12`,
`drives/walk-in:10`, `govt/page.tsx:12`, `jobs/internships:12`,
`jobs/full-time:12`, `jobs/part-time:12`, `companies/[slug]/page.tsx:203`.

### Shape divergence inside one route family

Eight hub pages carry `alternates.canonical` and all use the same
`{title, description, alternates, openGraph{…}, twitter{…}}` shape — **except**:

- **`(public)/jobs/remote/page.tsx:12-18` has canonical only. No `openGraph`, no
  `twitter`.** Its eight siblings all hand-roll the full 25-line block. This is
  the only hub silently inheriting the root defaults.
- `openGraph.siteName` is set on `(public)/page.tsx:29` and `opportunitySeo.ts:254`,
  omitted on every hub.
- OG image: `layout.tsx:57-58` uses `/opengraph-image` + `/twitter-image`; hubs
  use `/main.png`; `(public)/app/page.tsx:20,32` uses `/app/opengraph-image`.
- **`(public)/jobs/browse/page.tsx:14,20`** — `title` is
  `'Browse All Job Boards | Jobs by Role, City, Skill & Batch'` but
  `openGraph.title` is `'Browse All Job Boards | FresherFlow'`. **The OG title
  does not match the document title.**
- OG `description` diverges from `description` on 5 pages by design
  (`full-time:14` vs `:21`, `part-time:14` vs `:21`, `drives:14` vs `:21`,
  `off-campus:14` vs `:21`, `walk-in:12` vs `:19`) and is duplicated verbatim on
  `jobs:13/19/33`, `internships:13/20/33`, `govt:13/19/33`.

### Hardcoded absolute origin, bypassing `metadataBase` — 3 places

- `(public)/recruiters/layout.tsx:22` `url: 'https://fresherflow.in/recruiters'`
- `(public)/about/page.tsx:27` `url: 'https://fresherflow.in/about'`
- `(public)/blog/page.tsx:18` `url: 'https://fresherflow.in/blog'`

Every other public page uses a relative path. Also `layout.tsx:127-128`
hardcodes `'https://api.fresherflow.in'` as the `NEXT_PUBLIC_API_URL` fallback.

### Missing canonical/robots on public dynamic routes

`resources/[id]`, `resources/company/[id]`, `resources/skill/[id]`,
`community/[id]`, `community/rooms/[slug]`, `u/[username]` all return
`{title, description}` only — **no `alternates`, no `robots`, no OG**.
`u/[username]/page.tsx:46-56` adds a bare `openGraph` with `type: 'profile'` and
no image.

### Double-suffixed error title

`u/[username]/page.tsx:42` returns `title: 'Profile not found — FresherFlow'`
from `generateMetadata`; with the root template that renders as
`Profile not found — FresherFlow | FresherFlow`.

### Title-template inconsistency between groups

- `(admin)/admin/layout.tsx:5-8` sets `template: '%s'`, but all 12 child pages
  use `title: { absolute: '… | FresherFlow Admin' }` — **the template is dead.**
- `(moderator)/moderator/page.tsx:5` uses the same `absolute` form.
- `(admin)/admin/discovery/layout.tsx:4` uses the plain
  `'Discovery Engine - Admin'` form, which **does** go through the template.

---

## 4. JSON-LD — 4 emission sites, 3 builders

1. **`app/layout.tsx:129-140`** — inline `Organization`:
   `@context`, `@type`, `name`, conditional `url`, `logo`. No `description`, no
   `sameAs`.
2. **`app/(public)/page.tsx:38-45,113`** — a **second, divergent** `Organization`:
   same `name`; adds `description` and `sameAs` (2 URLs) the root omits; the root
   puts `logo` at the top level unconditionally while this one nests it behind a
   `SITE_URL` guard.
   **Because the root script is in `<head>` and this one is in the body, the
   homepage ships two conflicting `Organization` nodes for the same entity.**
3. **`app/(public)/jobs/[slug]/page.tsx:300-302`** — `generateOpportunityJsonLd` →
   `{@context, @graph: [BreadcrumbList, JobPosting]}` (`opportunitySeo.ts:421-424`).
4. **`app/(public)/govt/[slug]/page.tsx:181-182`** — emits **two** scripts back to
   back. `generateOpportunityJsonLd` already nests a `BreadcrumbList` in its
   `@graph` (`opportunitySeo.ts:391-423`), and
   `generateOpportunityBreadcrumbsJsonLd` (`:427-465`) rebuilds a
   **byte-identical** `itemListElement` — same 4 `ListItem`s, same positions,
   same `getOpportunityPath(…)` call.
   **The government detail route publishes the same breadcrumb graph twice.**
   `jobs/[slug]` correctly emits only the graph form; `govt/[slug]` is the outlier.
5. **`app/(public)/drives/walk-in/[city]/page.tsx:146-153,160-163`** — a fourth
   type, `CollectionPage`, built inline. Not shared.
6. **`features/jobs/components/OpportunitiesFeedClient.tsx:297,330`** — a fifth,
   `ItemList`, **inside a client component**, so it is client-rendered rather than
   in the server HTML.

**`JobPosting` itself is built once and is consistent** — `title`,
`description` (HTML-stripped), `identifier`, `datePosted`, `validThrough` (with a
`postedAt + 90d` fallback at `:272-274`), `hiringOrganization`, `jobLocation`,
`employmentType`, `directApply`, `skills`, `experienceRequirements`, plus
conditional `jobLocationType` / `applicantLocationRequirements` / `baseSalary` /
`occupationalCategory` / `qualifications`. **Worth keeping as-is.**

---

## 5. loading / error / not-found

13 files total: 5 `loading`, 5 `error`, 2 `not-found`, 1 `global-error`.
**Roughly 60 route segments have none of the three.**

### Error boundaries that bypass a shared primitive

`@/features/shell/ErrorState` (`ErrorState.tsx:16-43`) is a generic
`code`/`title`/`message`/`children` shell. **Only `app/error.tsx:14-25` uses it.**
Four others re-implement the same bordered-card markup with raw
`<button className=…>` instead of `Button`:

- `(public)/community/error.tsx:12-24`
- `(public)/community/[id]/error.tsx:12-31`
- `(public)/u/[username]/error.tsx:18-42`
- `(user)/dashboard/error.tsx:12-22`

`ErrorStateButton` (`ErrorState.tsx:45-67`) is exported and used by **nobody**.
`ErrorState` itself is used by **no nested boundary**.

### Leak

`app/global-error.tsx:20-21` renders the raw error to the client:

```tsx
<p style={{ color: '#666', fontSize: '0.875rem' }}>{error?.message || 'An unexpected error occurred.'}</p>
{error?.digest && <p …>Error ID: {error.digest}</p>}
```

**This violates the repo's own rule** (`apps/web/AGENTS.md`, "Do not return raw
server errors to clients") in the one boundary guaranteed to run in production,
since `error.message` on a server component failure carries server-side detail.

`app/error.tsx:17` correctly keeps a generic string, and
`(public)/u/[username]/error.tsx:10-14` is the best of the set — it logs
`error.digest` server-side and shows generic copy.

`app/error.tsx:10` only does `console.error`, no Sentry — `global-error.tsx:12`
does `Sentry.captureException`. **Inconsistent.**

### Skeleton duplication

- `(public)/community/loading.tsx:3-27` and `(public)/community/[id]/loading.tsx:3-14,20-48`
  share a `rounded-2xl border border-border bg-card p-6 space-y-*` article shape
- `(public)/jobs/[slug]/loading.tsx:18-103` is 85 lines of hand-placed
  `Skeleton`, and the page already has `<OpportunityDetailSkeleton />` inline at
  `page.tsx:304` — **the same geometry exists in two places**
- `(public)/u/[username]/loading.tsx:8-56` does not use `Skeleton` at all — it
  hand-writes `animate-pulse rounded-xs bg-muted` divs
- `(public)/govt/loading.tsx` is consistent with `Skeleton`, but
  `govt/[slug]/page.tsx:69-95` then redefines a `GovernmentDetailSkeleton`
  inline instead of reusing the sibling `loading.tsx`

### Silent errors and dead boundaries

- `(public)/community/[id]/page.tsx:25-30` and `community/[id]/error.tsx` both
  swallow — the page does `catch {}` with the comment "Will render 404 state in
  client", so a server render failure and a genuinely missing post produce the
  **same 200 HTML**
- `(user)/dashboard/error.tsx` wraps `dashboard/page.tsx`, which is a five-line
  `permanentRedirect('/jobs?tab=for-you')` stub. **It can never render.**
- `u/[username]/not-found.tsx:8` exports `revalidate = false` and correctly avoids
  cookies — but its comment at line 7 says reading cookies "would opt the whole
  `(public)/u` branch out of ISR". A `not-found.tsx` in a nested segment does not
  do that; only the segment's own config does. **The reasoning is right, the
  mechanism is misstated.**

---

## 6. Dynamic API usage — mostly correct

`cookies()` appears exactly **twice**: `api/auth/logout/route.ts:16` and
`(public)/submit/actions.ts:8`. `headers()` once: `(public)/submit/actions.ts:9`.

**No public SEO page reads cookies or user identity.** The auth chain is entirely
client-side (`ConditionalAuthProvider` is `'use client'`,
`ConditionalAuthProvider.tsx:1`). **This is correct and worth keeping.**

`searchParams` in server components: `(auth)/login/page.tsx:11` (in
`generateMetadata`), `(auth)/signup/page.tsx:20`, `(auth)/join/page.tsx:24`,
`(user)/settings/page.tsx:9`. Only `/settings` uses it, to forward a tab.

**No** `draftMode()`, `connection()`, `unstable_cache`, `cacheTag`, `cacheLife`,
or `'use cache'` anywhere in `app/`.

`unstable_noStore` is called via dynamic `import('next/cache')` in three places,
all for the same purpose — never cache a 404: `jobs/[slug]/page.tsx:238-239`,
`govt/[slug]/page.tsx:152-153`, `u/[username]/page.tsx:66-67`. **Consistent and
well-commented.**

### Tag invalidation is well-guarded

`api/revalidate/route.ts:18-43` hard-blocks 19 hub paths from `revalidatePath()`
with a comment citing a real 20k ISR-write incident (commit `8b1cc2d`), and
`:152` uses `revalidateTag(tag, 'max')` (lazy) rather than the immediate variant.
`deriveTagsFromPaths` (`:52-83`) derives entity-scoped tags
(`company-${slug}`, `city-${slug}`, `opportunity-${slug}`) rather than a global
`feed` tag. **This is the part of the caching setup that is genuinely correct.**

Gaps are in the duplication audit's scope: 12 of 18 `HUB_PATHS` entries are dead
(see [`03-data-fetching-caching.md`](03-data-fetching-caching.md) §4).

### High cardinality

- `(public)/jobs/[slug]/page.tsx:119-142` unions the **full** main + government
  feeds into `generateStaticParams` with **no bound**
- `(public)/companies/[slug]/page.tsx:163` correctly bounds to 150
- `(public)/drives/walk-in/[city]/page.tsx:16` sets `dynamicParams = false` and
  enumerates every walk-in city across three feeds, so a city appearing for the
  first time **404s until the next build**. The comment at `:14-15` says this is
  deliberate (bot cache poisoning) — but it means a genuinely new city is
  unindexable.

---

## 7. Route groups and layout nesting

The `permanentRedirect` in the page body runs **after** the layout renders, so
each of these mounts a full `NavigationWrapper` (`(user)/layout.tsx:7`) to serve
a 308: `(user)/saved/page.tsx:11`, `alerts/page.tsx:11`,
`notifications/page.tsx:11`, `tracker/page.tsx:11`,
`followed-companies/page.tsx:5`, `profile/page.tsx:5`, `referral/page.tsx:5`,
`feedback/page.tsx:5`, `settings/page.tsx:10`, `dashboard/page.tsx:5`.

Each is a Server Component, so Next 308s without a full client render — but the
layout tree is still constructed and its `metadata` computed for a response that
has no body.

**Nine `(user)/*/layout.tsx` files export `metadata` for a route that only
redirects.** Worse, the page-level `metadata` in `alerts/page.tsx:4-7`,
`notifications/page.tsx:4-7`, `saved/page.tsx:4-7`, `tracker/page.tsx:4-7`
**shadows** the layout's, so the layout titles at `alerts/layout.tsx:4`,
`saved/layout.tsx:4`, `tracker/layout.tsx:4` are **unreachable.** Both pairs
disagree: layout `'Job Alerts & Notifications'` vs page `'Job Alerts'`; layout
`'Saved Opportunities'` vs page `'Saved Jobs'`.

**These should be `next.config` redirects, not route segments.** The same pattern
in `(public)` — `(public)/community/{referrals,rooms,salary,saved-searches}/page.tsx:5`,
`(public)/platforms/page.tsx:5`, `(public)/post/page.tsx:4`,
`(public)/submit/page.tsx:4` — is cheaper, because `(public)/layout.tsx` is a
`'use client'` component that only calls `usePathname()`, with no data fetch.

`(admin)/layout.tsx:13` mounts `AdminProvider` and `(admin)/admin/layout.tsx:12`
mounts `AdminLayoutClient` — two nested wrappers, and the outer one's comment
block (`:16-21`) is four lines of deliberation left in the source.

**Fetch duplication:** `(public)/jobs/[slug]/page.tsx` calls `fetchFeedIndex(false, undefined, true)`
at `:160` in `generateMetadata` and again at `:199` in the page body — two
separate fetches for the same payload. The comment at `:148` claims "The
registry build shares the page component's feed fetch through React cache()", but
**the feed fetch itself is not cached**; only `loadTaxonomyRegistry` is.

`(public)/u/[username]/page.tsx:22` does this **correctly** with `cache()` around
`getProfile`, shared by `generateMetadata` (`:40`) and the page (`:61`) — a good
pattern that `jobs/[slug]` should mirror.

---

## 8. Redirects and rewrites

`next.config.ts:257-413` has **32 redirect entries, all `permanent: true`, no
loops, no overlapping destinations.** The taxonomy ledger (`:324-381`) is
coherent, and the comment at `:274-276` explains why `/walk-ins` goes direct
rather than chaining. **This is good — keep it.**

### BREAKING: `/moderation` no longer exists

Commit `73eb2ca9` renamed `(moderator)/moderation/` → `(moderator)/moderator/`
with `R100` (100% similarity — the directory moved, contents unchanged). Every
internal link still points at the old path:

- `(moderator)/moderator/page.tsx:10,12,13,14,15,16` — all six queue links
- `features/moderation/components/ModerationNav.tsx:8,10,11,12,13,14,23,26` —
  the entire nav, including the active-state check `pathname === '/moderation'`
- `features/admin/moderatorAccess.ts:72` — `return hasQueue ? '/moderation' : ''`
- `(admin)/admin/login/LoginClient.tsx:355` — `/login?redirect=/moderation`

**There is no `/moderation` redirect in `next.config.ts:257-413`.** The moderation
hub and all six queues are **unreachable by navigation**, and `ModerationGate`
(`ModerationGate.tsx:11`, comment "Single gate for /moderation") is guarding a URL
that 404s.

### Unreachable catch-all

`next.config.ts:409-412` —
`{ source: "/:slug([a-z0-9][a-z0-9-]*-[a-f0-9]{8})", destination: "/jobs/:slug" }`
matches any single-segment path ending in `-` + 8 hex chars. It is listed last so
real routes win, but a genuine one-segment page matching that shape would be
swallowed.

### Rewrites

Two entries (`:234-256`): `/sitemap.xml` → `/api/public/sitemap?file=sitemap.xml`
and `/sitemap-:name.xml` → the same handler. The dev-only `/api/:path*` proxy
(`:250-253`) is correctly gated behind `NODE_ENV !== 'production'`.
`robots.ts:64` advertises `${host}/sitemap.xml`, which the rewrite serves —
**consistent.**

### robots.txt

`robots.ts:41-53` disallows `/admin`, `/api`, `/account`, `/login`, `/signup`,
`/logout`, `/onboarding`, `/dev`. It does **not** list `/moderator` (mitigated only
by per-page `robots: {index:false}` at `moderator/*/page.tsx:6`), nor `/join` or
`/choose-username` (mitigated by `join/page.tsx:7` and
`choose-username/layout.tsx:6`).

**The `allow` array at `robots.ts:31-40` is a no-op** in robots.txt semantics —
`Allow` cannot narrow a wildcard group, so those 9 paths are crawled and indexed
unless a page's own metadata says otherwise. `/app`, `/resources`, `/u`,
`/community`, `/recruiters`, `/blog` are not in the allow list but also not
disallowed, so they are crawled. The allow list documents intent, not behavior.

`X-Robots-Tag: noindex` headers at `next.config.ts:207-227` cover `/admin`,
`/admin/:path*` and the admin host — **this correctly backstops the admin surface
independently of metadata.**

### Should be next.config entries

`(public)/post/page.tsx:4` and `(public)/submit/page.tsx:4` both
`redirect('/contribute')`, and `(auth)/join/page.tsx:30` /
`(auth)/signup/page.tsx:27` both redirect into `/login` — these four belong
alongside the 32 already there.
