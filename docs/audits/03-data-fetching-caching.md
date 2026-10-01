# Audit 03 — Data fetching, transports, caching

Read-only. Scope: `apps/web/src/lib/api`, `apps/web/src/lib` fetch helpers,
`packages/api-client`, and every data-fetching call site.

> Note: `lib/api/core.ts` and `server-client.ts` were mid-edit during this
> audit — a `normalizeApiBase` copy was extracted to
> `lib/api/normalize-api-base.ts` between two reads. Line numbers reflect the
> worktree at time of read.

---

## 1. Transport inventory — 7 distinct ways to reach the backend

| # | Transport | Site | Base URL | Auth | Retry / timeout | Error shape |
|---|---|---|---|---|---|---|
| **T1** | Browser `fetch` client `apiClient` | `lib/api/core.ts:375` | `getApiBaseForEndpoint` `:325`; `NEXT_PUBLIC_USER_API_URL`→`NEXT_PUBLIC_API_URL` `:228-229`; admin `:230-231`; relative on localhost `:235` | Bearer from `localStorage` `ff_user_access_token_v1` (`:24`, `setUserTokens` `:180`) + Firebase ID token fallback `:400-413`; admin token `:26`; `credentials:'include'` for most GETs `:359,428` | 3 tries, 300ms×3^n `:437-441`; 10s abort `:445`; 5xx only, except 501/503 `:456-462` | `Error & {statusCode, data}` `:653`; `UnauthorizedError` `:16`; `OfflineError` `:7`; 403→`PROFILE_INCOMPLETE` `:610-617` |
| **T2** | RSC client `serverApiClient` | `lib/api/server-client.ts:38` | `:6-12`, prefers `API_URL`/`USER_API_URL`/`ADMIN_API_URL` then `NEXT_PUBLIC_*` | forwards all `next/headers` cookies `:46-63` + `Origin`/`X-Forwarded-Host` `:65-68` | **no retry, no timeout, no abort** | `Error & {status}` `:99-101` |
| **T3** | CDN client | `lib/api/cdnFeed.ts` | `FEED_CDN_BASE` per `FEED_SOURCE` (`runtimeConfig.ts:124-128`) | HMAC `?v=&sig=` `:88-107`, secret at `:92` | 10s; 6s detail, 3.5s category, 3.5/12s company (`getCDNTimeout` `:133`) | returns `null`, never throws |
| **T4** | `@fresherflow/api-client` (axios) | `packages/api-client/src/apiClient.ts:36` | `getInferredBaseUrl()` `config.ts:9` | Bearer from `ff_auth_token_v1` **only** `apiClient.ts:71-77`; storage wired once `core.ts:36-58` | `timeout: 10000` `:55`; **no retry** | `HttpError{status, body}` / `OfflineError` `:16-34` |
| **T5** | Bare same-origin `fetch` | many | relative | ambient cookies, no Bearer | none | caller-defined |
| **T6** | Direct cross-origin API from browser | `landing/LiveStatsBox.tsx:35`, `LandingMarquee.tsx:52` | `NEXT_PUBLIC_API_URL` literal | none | `AbortSignal.timeout(6000)` | `r.ok ? r.json() : null`, swallowed |
| **T7** | Ingestion service | `app/api/search/route.ts:11-28` | `INGESTION_SERVICE_URL` | none | 60s `:58` | generic `{error}` |

**T2 has only 4 call sites** (`u/[username]/page.tsx:24`,
`…/opengraph-image.tsx:25`, `app/api/admin/discovery/push/route.ts:214,266,304,315`)
— 1–2 call-site transport. **T6 has 2.**

**Correct:** token storage is `localStorage`-only, never a JS-readable cookie.
T1 sets `cache:'no-store'` for all private prefixes (`core.ts:335-349`).

---

## 2. Duplicate client code

| Concern | Sites | Note |
|---|---|---|
| **Base URL normalisation** | was duplicated verbatim in `core.ts` and `server-client.ts`; now extracted to `normalize-api-base.ts:14`. **A third** remains at `runtimeConfig.ts:3-15` (`new URL(raw).origin` — origin-only, drops paths) and a **fourth** at `packages/api-client/src/config.ts:47-55` | **4 normalisers, 3 different semantics** |
| **Error message unwrapping** | `core.ts:596-603`, `server-client.ts:86-88`, `apiClient.ts:96-98`, `lib/api/client.ts:24-33` `readServerMessage` | **4 parsers for one envelope** |
| **"Too many / server down" fallbacks** | `core.ts:600-607` and `server-client.ts:89-95` | duplicated verbatim |
| **Bearer injection** | `core.ts:400-420` (localStorage + Firebase), `apiClient.ts:65-84` (storage) | **two independent token keys** mirrored at `core.ts:180-191` |
| **`/api/jobs/*` endpoints** | `features/jobs/api/community.ts:36-60` **and** `packages/api-client/src/public/community.ts:36-44` | the web file's docblock (`:19-35`) says the package client is "axios without storage configured in web (zero `configureClient` calls)". **That is now stale** — `core.ts:36-58` does call `configureClient` |
| **Retry** | `core.ts:437-492` only | T2, T4, T5, T6, T7 have none |

---

## 3. Error handling — 5 different shapes for a non-2xx

| Layer | Shape | Caller unwraps by |
|---|---|---|
| T1 | `Error{statusCode, data}` | `err.statusCode`, `err.code`, `err.completionPercentage` |
| T2 | `Error{status}` | `(error as {status?}).status` — `u/[username]/page.tsx:33` |
| T3 | `null` return | truthiness at every call site |
| T4 | `HttpError{status, body}` | `instanceof HttpError` |
| T5 | `Error(message)` from `readServerMessage` | `err.message` only |

Ad-hoc `if (!res.ok)` sites and what the caller does with the body:

- `lib/api/client.ts:39` → `res.json()` in try/catch → generic
  `'Could not sign out all sessions.'`; **body discarded**
- `lib/api/client.ts:58` → parses body **before** the ok check, reads `revokedCount`
- `lib/api/client.ts:70` → `res.json()` → generic, body discarded
- `cdnFeed.ts:225` → returns `null`, **body never read**
- `cdnFeed.ts:292,322,412,464,512,524,636,676,721,746,782,827` → all `return null`;
  only `:414,425,466,526,644,684` log; bodies never inspected
- `liveSearch.ts:58` → `res.json().catch(…)` → the **only** caller that surfaces
  the server string
- `features/resources/api/getResourcesFeed.ts:24` → returns `EMPTY_FEED` (silent
  empty state)
- `CaptionsTool.tsx:208` → `throw new Error('Failed to fetch opportunities')` —
  **body discarded**; `:448,642,685` use `data.error`
- `SocialLinksSection.tsx:94` → `throw new Error('Failed to load repositories')`,
  body discarded
- `app/api/public/nav-counts/route.ts:43` → returns zeroed counts, body discarded
- `app/api/search/route.ts:61` → logs body server-side, returns generic —
  **correct**

---

## 4. Caching audit

| Route | Data | Mode | Revalidate | Tags |
|---|---|---|---|---|
| `/` | feed-index + companies | `revalidate=false` | — | `feed-index`, `companies-metadata` |
| `/jobs`, `/jobs/internships`, `/remote`, `/full-time`, `/part-time`, `/browse` | feed-index | `revalidate=false` | — | untracked |
| `/jobs/[slug]` | shard → bootstrap/govt/expired | `revalidate=false`, `dynamicParams=true` | — | untracked |
| `/companies` | companies + feed-index | `revalidate=3600` | 3600 | untracked |
| `/companies/[slug]` | company shard | `revalidate=3600`, `dynamicParams=true` | 3600 | untracked |
| `/drives/**` | feed-index / govt / expired | `revalidate=false`; `[city]` has `dynamicParams=false` | — | untracked |
| `/govt`, `/govt/[slug]` | govt feed | `revalidate=false` | — | untracked |
| `/u/[username]` | public profile | `revalidate=60` | 60 | none |
| `/u` | directory | `revalidate=3600` | 3600 | none |
| `/community`, `/community/[id]` | axios `communityApi` | **no route config at all**; axios bypasses the Next fetch cache | — | none |
| `/resources` | resources feed | `next:{revalidate:600}` | 600 | **none** |
| `/resources` | internship platforms | `next:{revalidate:3600}` | 3600 | **none** |
| `/api/public/feed` | feed-index/govt | `revalidate=false` + `force-dynamic`; response `s-maxage=600` | — | untracked |
| `/api/public/job` | full bootstrap feed | same; `s-maxage=600` | — | untracked |
| `/api/public/nav-counts` | `FEED_STATS_URL` | `force-dynamic`; fetch `revalidate:300, tags:['feed-stats']` | 300 | `feed-stats` |
| `/api/public/sitemap` | CDN XML | `force-dynamic`; fetch `revalidate:3600` | 3600 | none |
| `(admin)/admin/*` (19 pages) | client-fetched | **no `revalidate`/`dynamic`** except `audit` + `reports` | — | — |

### What is correct

- **No public SEO page is on `no-store` at the route level.**
  `unstable_noStore()` is called only on miss paths
  (`u/[username]/page.tsx:66-67`, `jobs/[slug]/page.tsx:238-239`) — correct.
- **No public page reads cookies or user identity.** `server-client.ts:46-63`
  reads `cookies()`+`headers()` only when `isPrivate || credentials==='include'`,
  and `/api/public/profiles/…` is not in `privatePrefixes` (`:23-32`).
- **No user-specific data is cached too broadly.** Every `(user)/*` route is a
  `permanentRedirect`; `/admin/*` goes through T1, which sets `cache:'no-store'`
  for `/api/admin` (`core.ts:335-337`).
- **No cross-user cache poisoning.** `features/jobs/actions.ts:37,51-52,65,79,103,123`
  are admin-only and target `/admin/opportunities*`.

### Flags

**`/api/revalidate` is well designed.** `route.ts:18-43` hard-blocks 19 hub paths
from `revalidatePath()` with a comment citing a real 20k ISR-write incident
(commit `8b1cc2d`), and `:152` uses `revalidateTag(tag, 'max')` (lazy) rather
than the immediate variant. `deriveTagsFromPaths` (`:52-83`) derives
entity-scoped tags rather than a global `feed` tag. **Keep this.**

Three gaps:
- `deriveTagsFromPaths` pushes the **global** `homepage-feed` on any normal slug
  (`:60`), so one job publish invalidates every hub page's feed. The intended
  trade, stated at `:10-12`.
- `company-${lastPart.split('-')[0]}` (`:78`) derives a company tag from the
  **first slug segment** — a guess, not the real company slug.
- **12 of the 18 `HUB_PATHS` entries have no corresponding route file**
  (`/opportunities`, `/walkins`, `/location`, `/locations`, `/batch`, `/skills`,
  `/roles`, …) — dead guards. `/drives/walk-in/:city` and `/jobs/:slug` are
  **not** in the set and rely on the caller.

**Untagged caches that can never be invalidated, only aged out:**
`/resources` (`getResourcesFeed.ts:21`), `/api/public/sitemap` (`:21`),
`/api/public/feed`, `/api/public/job`.

**`no-store` on feed fetches in production:** yes, three. `cdnFeed.ts:296,311,349,515,542`
are dev-gated, **but** the
`feedVersion.stable ? 'force-cache' : 'no-store'` branches at `:457,504,630,670`
go `no-store` in production **whenever the version fetch fails**. `:504` and
`:670` are the `government-feed` and company shards. A CDN hiccup silently drops
every downstream fetch out of the Next data cache.

**Client fetches missing abort on unmount:**
- `useOpportunityDetail.ts:103,179` — a `cancelled` flag guards the outer
  effect, but the inner `fetch` at `:179` is not cancelled
- `SavedTab.tsx:45`, `AppliedTab.tsx:107`, `DashboardClient.tsx:180` —
  `fetchFeedIndex()` in a bare `useEffect(…, [])` with no cleanup
- `cdnFeed.ts:224` `fetchFullFeedOnClient` — module singleton, never aborted
- `useNavCounts.ts:95` — no signal
- `DiscoveredJobsTab.tsx:100,124`, `ProcessedJobsTab.tsx:84,121,141,159,185`,
  `CaptionsTool.tsx:207,417-418,442,636,679` — no signal
- `liveSearch.ts:52` — no signal; the 60s server timeout means an unmounted
  search runs to completion

**Correct:** `core.ts:445`, `app/api/search/route.ts:58`,
`app/api/admin/social/*.ts`, `lib/server/ingestion/targets.ts:47`,
`EducationSection.tsx:165`, `LiveStatsBox.tsx:36`.

---

## 5. Feed sources and fallback

Source switch: `FEED_SOURCE=cdn|db|local` at `utils/runtimeConfig.ts:112-128`.

- **Live-API fallback sites, all gated to `NODE_ENV==='development'`**:
  `cdnFeed.ts:296` (hardcoded `https://api.fresherflow.in/bootstrap-feed.min.json`,
  `no-store`), `:311`/`:349` local, `:515`/`:542` government.
  **No production fallback exists** — a CDN failure in prod returns `null` at
  `cdnFeed.ts:322-328,464-468,524-528,636-639,676-679,721-724,746-749,782-785,827-831`.
- **Silent degradation:** yes. `_fetchFeedIndex` falls back to the full
  bootstrap on non-ok (`:412-416`), on bad shape (`:419-421`), and on throw
  (`:424-427`) — the **~2MB** feed replaces the **~100KB** index with only a
  `console.warn`. Callers cannot distinguish the two.
- `_fetchFeedVersion` returns `{version:'fallback'}` on miss (`:202`); in the
  browser it short-circuits to `fallback` without any request (`:174-181`).
- `_fetchOpportunityDetail` returns `null` on any miss (`:602-606`); the comment
  at `:604` says "Fallback to bootstrap feed search in caller" — the client
  caller does that (`useOpportunityDetail.ts:82-95`).

---

## 6. Server/client boundary

- **`app/(public)/community/[id]/page.tsx:2` is a Server Component importing the
  browser-oriented axios client**, and calls it in **both** `generateMetadata`
  (`:12`) and the page (`:26`) — two HTTP calls, no `React.cache`, no dedupe.
  The file has **no** `revalidate`/`dynamic`.
- `core.ts:36-58` runs `import('@fresherflow/api-client')` inside a
  `typeof window !== 'undefined'` guard — correct, but it means T4 has **two
  different configurations** (storage-less on the server, storage-backed in the
  browser) depending on which side calls it.
- `cdnFeed.ts` is imported by four client components (`SavedTab.tsx:13`,
  `AppliedTab.tsx:7`, `DashboardClient.tsx:17`, `useOpportunityDetail.ts:16`)
  and therefore enters the client bundle. It reads
  `process.env.CDN_SIGNATURE_SECRET` at `:92` and `:111`. **No secret leaks** —
  Next replaces non-`NEXT_PUBLIC_` vars in client bundles with `undefined` — but
  the module ships dead signing code plus `new URL`/crypto helpers to the
  browser.
- `LiveStatsBox.tsx:35`, `LandingMarquee.tsx:52` read
  `process.env.NEXT_PUBLIC_API_URL` in client code and hardcode a fallback
  origin.
- **No non-`NEXT_PUBLIC_` secret is read in a client bundle.** Only
  `process.env.NODE_ENV` (`LoginForm.tsx:183`, `AuthModal.tsx:162`,
  `ServiceWorkerRegister.tsx:18`).
- `useOpportunitiesFeed.ts:5-6` has commented-out API imports;
  `WEB_STATIC_DISCOVERY = true` (`:23`) makes the live branch at `:182-194`
  unreachable — dead code that throws by design.

---

## 7. Request waterfalls

- `useOpportunityDetail.ts:80 → :83 → :91 → :103` — **four sequential awaits**
  (shard → bootstrap ~2MB → expired feed → `/api/public/job`). A shard miss on a
  page that already has `initialData` still pays the full chain.
- `useOpportunityDetail.ts:166 → :179` — shard fetch then proxy fetch, sequential.
- `companies/[slug]/page.tsx:240` (metadata) then `:285` (page) both fetch
  companies/feed-index. `React.cache()` is present on
  `fetchOpportunityForPage` (`opportunitySeo.ts:119`) but **not** on
  `fetchCompaniesMetadata` (`:182` vs `:240` are separate calls with different
  `untracked` args, so they do not share).
- `jobs/[slug]/page.tsx:195` then `:199` then `:227-230` — **three separate
  `fetchFeedIndex` calls per request**, deduped only because all pass
  `untracked=true` to the same `cache()`-wrapped function.
- `jobs/[slug]/page.tsx:157 → :160` then `:176` — metadata resolves the registry
  before the shard.

**Correct:** `(public)/page.tsx:50`, `jobs/page.tsx:57-60`,
`companies/[slug]/page.tsx:181-184,285-288`, `govt/[slug]/page.tsx:33-34`,
`opportunitySeo.ts:127-131` all use `Promise.all`.

---

## 8. N+1

- **`features/admin/moderators/useModerators.ts:147`** —
  `for (const id of userIds) { await fn(id, …) }` — one awaited call per id,
  fully serial. **The only true per-item-await loop in `apps/web/src`.**
- `DiscoveryWorkspace.tsx:180` — batched with `Promise.allSettled` + a
  `batchSize` cap — **correct**
- `useCommentCounts.tsx:56-66` — chunked at `MAX_IDS_PER_REQUEST` with a
  `requestedRef` guard `:90-91` — **correct anti-N+1**
- `useNavCounts.ts:95` — one module-level request shared by all mounts —
  **correct**

No other `for`/`map(async)` loop awaits a fetch (verified across all `.ts`/`.tsx`).

---

## Correct as-is

- Private/auth data is never statically cached: T1 `no-store` on 9 prefixes,
  T2 `no-store` on 7, cookie forwarding limited to private reads
- The hub-path `revalidatePath` guard plus lazy `revalidateTag(tag,'max')`
- Rate limiting on all 6 public GET/POST API routes reviewed (`feed:66`,
  `job:55`, `search:122-123`, `nav-counts:54`, `sitemap:50`, `revalidate:168`)
- Upstream error bodies are never returned to clients
- The CDN signature scheme keeps the secret server-side; browsers go through
  same-origin proxies (`app/api/public/feed/route.ts:16-18`)
- Comment counts and admin discovery runs are batched, not N+1
