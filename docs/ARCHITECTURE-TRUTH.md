# FresherFlow — Architecture Truth (assumption-killer)

Date: 2026-09-10. Purpose: replace guesses about this repo with verifiable facts.
Rule: every structural claim cites `file:line`. Line numbers were read from the
current worktree; re-verify with grep before quoting them elsewhere.
Related guides: root `AGENTS.md`, `apps/web/AGENTS.md`, `apps/api/AGENTS.md`,
`scripts/job-discovery/AGENTS.md`, `scripts/job-processor/AGENTS.md`.

> How to use this file: read it before proposing any migration (Firebase→D1,
> Vercel→Cloudflare, R2→database, Prisma→Drizzle). Most such proposals in the
> past were based on an imagined architecture, not this one.

---

## 1. Verdict on the "assumption message"

The message under review claimed: Postgres = source of truth, R2 = JSON
snapshots, Vercel = frontend, Firebase Auth = users, Firebase RTDB = profiles /
saves / views. It then proposed: single Postgres truth + Cloudflare Worker API
+ R2-as-cache, keep Vercel, don't migrate RTDB→D1 "just because SQL".

What is **correct**:

- Postgres (via Prisma in `packages/database`) IS the system of record for
  business data: users, profiles, opportunities, saves, actions, alerts,
  ingestion, orgs. See §3.
- R2 objects ARE derived snapshots, not a database. Web/mobile never write
  business state to R2. See §5.
- Vercel hosting for web is fine and there is no in-repo reason to migrate it
  (`vercel.json:1-8` is only framework/build/output, no rewrites/WAF).
- There is NO D1, NO Drizzle, NO Hyperdrive, NO `wrangler.toml`, and NO
  `packages/domain` in this repo. Any plan mentioning them is greenfield, not a
  migration. (`packages/` = `api-client, constants, database, frontend-core,
  parser, pipeline, plugins, queue, types, ui, utils`.)

What is **wrong or incomplete**:

1. **RTDB is not "just cache".** It is a second write plane. Saves, tracker
   state, follows, alert prefs, views/applied counters, comments, feedback, and
   onboarding flags are written to RTDB from clients, and two Express routes
   were deliberately stubbed out with "fully handled in Firebase RTDB"
   comments. See §6. A "Postgres owns everything" plan must account for
   migrating live client write paths, not just reading data back.
2. **There is no Cloudflare Worker API.** The only edge worker in the repo
   (`apps/api/src/infrastructure/cloudflare/edgeWorker.ts`) is a signed-R2
   gate (HMAC `v=`/`t=` check + immutable cache headers). It serves files; it
   is not an API layer. See §7.
3. **The R2 staleness story is bounded, not open-ended.** Feed objects are
   version-busted (`?v=<feed-version>&sig=...`) and the landing page races CDN
   with a 200 ms timeout, so a salary edit does not linger forever — but the
   re-publish refresh call in `publish.service.ts:109-111` is currently
   commented out, so regeneration today depends on `scheduleRefresh`/cron, not
   on publish. That is the real staleness risk. See §5 + §10.
4. **`/api/stats` is split-brain.** Web's `LandingStats.tsx:48-50` fetches
   same-origin `/api/stats` (Cloudflare Analytics at the edge, 5-min cache).
   No `apps/web/src/app/api/stats/*` route exists in the repo; the Express
   implementations that DO exist are `routes/public/health.ts:59-81`
   (`GET /api/stats` from `public/stats.json`, fallback DB count) and
   `routes/public/stats.ts:13-29` (`/api/public/stats`). Do not conflate them.

---

## 2. Actual system map

```text
                    ┌────────────────────────┐
                    │  Postgres (Neon/local) │
                    │  SYSTEM OF RECORD      │
                    │  packages/database/    │
                    │  prisma/schema.prisma  │
                    └───────────┬────────────┘
                                │ Prisma (API + scripts only)
                                ▼
                    ┌────────────────────────┐
                    │  Express API (Node)    │
                    │  apps/api/src/index.ts │
                    │  APP_MODE=user/admin   │
                    └───┬────────┬───────┬───┘
                        │        │       │
              publish/  │        │       │  auth/session
              generate  │        │       │  saves/actions
                        ▼        ▼       ▼
              ┌─────────────────────────────────┐
              │  R2 bucket (derived snapshots)  │  files/cache only
              │  feeds/*, meta/*, jobs/*.json   │  (never written by clients)
              │  sitemaps/*, *.json (root)      │
              └───────────────┬─────────────────┘
                              │ signed URLs (?v=&sig= / ?t=&sig=)
                              │ Cloudflare edge gate (edgeWorker.ts)
                              ▼
              ┌──────────────────────────────┐
              │  Web (Next.js on Vercel)     │─── Firebase Auth (identity)
              │  apps/web, ISR revalidate=   │─── RTDB (behavioral writes)
              │  false + tags, 200ms race    │
              └──────────────────────────────┘
              ┌──────────────────────────────┐
              │  Mobile (Expo, MMKV)         │─── Firebase Auth (identity)
              │  syncModule.ts + signatures  │─── RTDB (behavioral writes)
              └──────────────────────────────┘

  Pipeline (outside request path):
  job-discovery (ATS+aggregators → R2 candidates)
      → job-processor (normalize → submit to API)
          → API → Postgres → feed regen → R2
```

Hard boundaries (from root `AGENTS.md`): frontends never import Prisma or
`packages/database`; frontends call backend via `packages/api-client`; web does
not import from `apps/api`; business rules live in `packages/domain` — which
does not exist yet, so shared rules currently live in `packages/types`,
`packages/utils`, and API services.

---

## 3. Source of truth: Postgres via Prisma

- Schema: `packages/database/prisma/schema.prisma` (1335 lines, `postgresql`,
  40 models). Client: `packages/database/src/index.ts` — singleton `prisma`
  over `pg.Pool(DATABASE_URL)` + `PrismaPg` adapter, `globalThis` cache in
  non-prod, throwing proxy when `MAINTENANCE_MODE=true`.
- Redis client lives at `packages/database/src/redis.ts:128-133` (ioredis,
  `REDIS_URL` else localhost, in-memory mock for test/disabled) and is
  re-exported by `packages/database/src/index.ts`. There is no
  `packages/redis/` directory. Queue defs live in `packages/queue/src/index.ts`
  (`notifications`, `broadcast`, `internal`, `scraper`, `index.ts:15-28`).

Model groups (exact names):

- Identity: `User` (`firebase_uid?` unique, `username?` unique, `role`,
  `trustScore`, referrals self-relation), `RefreshToken`, `Authenticator`,
  `WebAuthnChallenge`, `DeviceToken`, `UserFollow`, `ReferralBadgeGrant`.
- Profile/career: `Profile` (1-1 `User`; education, cities, workModes, skills,
  links, `completionPercentage`, `openToRecruiters`, visibility), `Project`,
  `SavedCandidate`, `ProfileView`, `Organization`, `OrganizationMembership`,
  `OrganizationInvite`, `CandidateInterest`.
- Jobs: `Opportunity` (slug unique, type, company, description, eligibility
  arrays, locations, salary/stipend, links, `status`, `postedByUserId`,
  counters `savesCount/clicksCount/sharesCount/commentsCount/trendingScore`,
  `search_vector`), `WalkInDetails` (1-1), `GovernmentJobDetails` (1-1, ~60
  fields), `OpportunityEvent` (1-N), `CompanyTarget`.
- User↔job state: `SavedOpportunity` (`@@unique[userId,opportunityId]`),
  `UserAction` (`actionType`, same unique), `ListingFeedback`,
  `OpportunityComment`, `AlertPreference` (1-1), `AlertDelivery`,
  `AlertDispatchLog`, `PlatformEvent` (generic event log), `PushSubscription`,
  `DeviceToken`.
- Ingestion: `IngestionSource` → `IngestionRun` → `RawOpportunity` (→
  `Opportunity?`), `DomainReputation`.
- Resources/social: `ResourceCollection`, `ResourceItem`, `SocialPost`,
  `TelegramBroadcast`.

Explicitly MISSING (do not assume they exist):

- No `Resume`/`ResumeFile` model. Closest: `Profile` skills/education,
  `Project`, `ResourceItem(FILE/PDF)`.
- No `Application` model. "Applied" = `UserAction(actionType=APPLIED, ...)`
  (one row per user+opportunity) + `Opportunity.applicationDetails(Json)` +
  recruiter-side `CandidateInterest`.
- No `View`/`SearchHistory` model. Views = `UserAction(VIEWED)` +
  `PlatformEvent(type=VIEW_JOB)` + `Opportunity.clicksCount` + RTDB counters
  (§6). The old `OpportunityClick` model is commented out
  (`schema.prisma:824,839` — "Moved to PlatformEvent").

---

## 4. What happens on each user action (ground truth)

### Save (bookmark)

1. Authoritative path: `POST /api/saved/:id` (`apps/api/src/routes/saved.ts:15-78`,
   `requireAuth`, accepts id or slug, toggles `SavedOpportunity`, updates
   `savesCount` via `application/opportunity/engagement.ts:7-44`).
   `GET /api/saved` lists (`saved.ts:84-115`).
2. Web hook path actually used by UI: `useSavedJobs.ts:1-165` dual-writes
   `localStorage ff_local_saved_v1` + RTDB `/users/{uid}/savedJobs`
   (`useSavedJobs.ts:98,150`) and does NOT call the Prisma API in that hook.
   Prisma path exists separately (`lib/api/social.ts:61-68`,
   queued offline in `lib/api/offline/actionQueue.ts:145`).
3. Mobile: `useSaved()` from `@repo/frontend-core`
   (`packages/frontend-core/src/saved/index.tsx:69,203-210` writes RTDB,
   `:174-182` bootstraps from MMKV first).

### Apply / tracker

1. Prisma: `UserAction` upsert via `POST /api/actions/:id`
   (`apps/api/src/routes/actions.ts:16-109`, validates `userActionSchema`,
   normalizes `PLANNING→PLANNED`, `ATTENDED→INTERVIEWED`, PUBLISHED-only guard,
   walk-in date guard). `GET /api/actions/summary` counts by state
   (`actions.ts:134-175`).
2. Clients keep a local-first copy: web `useFirebaseTracker.ts:70,108,128`
   (RTDB `/users/{uid}/tracker` + `ff_local_tracker_v1`), mobile
   `firebaseTrackerDb.ts:29-31,37-63` + MMKV hydration
   (`useFeedStore.ts:48-69`).

### View / click

1. Active click API: `POST /api/public/opportunities/:id/click`
   (`routes/public/opportunities/clicks.ts:16-44`) → `clicksCount++`
   (`engagement.ts:26`) + `eventService.track({type:'CLICK_APPLY'})`.
2. Legacy route disabled: `routes/public/opportunityClicks.ts:11-12` returns
   `202 {ok:true}` with comment "fully handled in real-time on Firebase
   RTDB"; Prisma logic there is commented out (`:14-79`).
3. Comments likewise offloaded: `routes/public/opportunities/comments.ts:13-14`
   "handled fully in real-time on Firebase RTDB" (`GET` → `[]`).
4. Web emits apply-clicks with a local session id
   (`lib/api/opportunities.ts:3-38`, `ff_click_session_id` via
   `crypto.getRandomValues`). Mobile tracks seen/opened in MMKV
   (`utils/cache/seenJobs.ts:3-76`, `ff:seen_job_ids`).

### Search

- Stateless. `GET /api/opportunities/search`
  (`routes/public/opportunities/search.ts:19-99`) enriches `isSaved`,
  `Cache-Control: private, no-store`. No search-history table; only mobile
  persists recent keywords in MMKV (`utils/userBehavior.ts:3-49`, max 5).

---

## 5. R2 strategy (derived snapshots, not a database)

Transport: `infrastructure/services/storage.service.ts:17-36,55-104`
(S3-compatible client from `R2_ENDPOINT/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/
R2_BUCKET_NAME`).

Producer — `infrastructure/services/staticFeed.service.ts`:

- Entry `scheduleRefresh()` debounced (`FEED_REFRESH_DEBOUNCE_MS`, default
  5000 ms, `:27-34`); `refresh(target='all')` delegates to
  `FeedGeneratorService` (`:66-113`).
- Uploaded keys (exact): `feeds/bootstrap-feed.min.json:181`,
  `feeds/feed-index.json:220`, `feeds/government-feed.json:234`,
  `feeds/walkins-feed.json:248` (+ alias `feeds/walkins.json:249`),
  `feeds/expired-feed.min.json:268`, `feeds/syllabus.json:280`,
  `meta/feed-version.json:292`, `meta/stats.json:306`
  (`{opportunities, companies, timestamp}`, `:299-304`),
  `sitemaps/sitemap*.xml:565-574`, `sitemaps/sitemap-data.json:592`,
  `meta/generated-hubs.json:680`, `meta/taken-usernames.min.json:694`,
  `feeds/links.min.json:714`, `feeds/resources-feed.json:722`,
  `jobs/{id}.json:775,807`. Root-bucket metadata (`companies.json`,
  `cities.json`, `skills.json`, `education.json`, `syllabus.json`) is uploaded
  by `metadata.service.ts:209,273,307,379,429`.
- Known gaps: `companies/{slug}.json` upload is explicitly DISABLED
  (`:749-750`, "not used by any consumer"); no `uploadToR2('categories/...')`
  exists in this file although web defines
  `GET_CATEGORY_SHARD_URL=${CDN_URL}/categories/{id}.json`
  (`runtimeConfig.ts:124-128`). Category shards are built in-memory
  (`feedGenerator.service.ts:342-382`) — verify producer before relying on them.

Consumer — web `lib/api/cdnFeed.ts` + `lib/utils/runtimeConfig.ts:91-136`:

- Reads feed-index, bootstrap, government, expired, `jobs/{id}.json`
  (slug→id resolved via index, `:506-510`), education/skills/companies
  metadata, sitemap-data — all `force-cache + revalidate:false + narrow tags`
  (`homepage-feed`, `feed-index`, `government-feed`, `company-{slug}`, ...).
- Freshness via `signUrlWithVersion` (`cdnFeed.ts:85-101`):
  `?v=<feed-version>&sig=HMAC(pathname:version)` → edge serves immutable
  (`max-age=31536000, immutable` for `v=` URLs, edgeWorker.ts:149-159).
  Mobile legacy uses time-bucketed `?t=&sig=` (`cdnSignature.ts:163-189`;
  secret only from EAS build secret, never `EXPO_PUBLIC_`).

The salary-edit example, precisely: Postgres is updated by publish
(`application/opportunity/publish.ts:9-55`, DRAFT-only guard, sets
`PUBLISHED/postedAt/publishedAt/lastVerified`); `publish.service.ts:89-106`
invalidates granular tags and `:114-119` appends metadata + regenerates OG
images for new JOB/INTERNSHIP/WALKIN. BUT the debounced
`StaticFeedService.scheduleRefresh()` call there is commented out
(`:109-111`), so R2 re-upload timing depends on the scheduler/cron path, not
on the publish request itself. Stale-window = time until next refresh +
  CDN version bump, not "until someone notices". Fix scheduling, not the
  whole storage layer, if this bites.

---

## 6. Firebase role (identity plane + behavioral write plane)

No Firestore anywhere (grep for `firestore|getFirestore` returns nothing).
Regions: prod `fresherflow-3604b...asia-southeast1`, staging `dev-staging`
(`web/src/lib/api/firebase.ts:12-17`, `mobile/src/config/firebase.ts:53-63`,
`api/src/lib/firebase.ts:28,36,49`).

- **Auth (identity only):** web `AuthContext.tsx:210,277-288,390-493,514-528`
  (`getIdToken(true)`, `signInWithCustomToken`, `onAuthStateChanged`,
  session cached as `ff_cached_session_v1` + `ff_logged_in` cookie hint);
  mobile `useAuthHandshake.ts:21,41,58-69`; API verifies/mints
  (`middleware/firebaseAuth.ts:36`, `routes/auth.ts:170-171,237-239`,
  `lib/firebase.ts:64-76`, initialized `index.ts:519`).
- **RTDB (behavioral data clients write directly):**

| Path | Evidence |
|---|---|
| `/users/{uid}/careerProfile` | web `AuthContext.tsx:115,127`; mobile `firebaseProfileDb.ts:21-48` |
| `/users/{uid}/onboarding` | web `AuthContext.tsx:141-156`; mobile `firebaseOnboardingDb.ts:27-80`; API `firebaseDb.service.ts:20-24` (called from `profile.service.ts:212-213,280-281,642-644`) |
| `/users/{uid}/savedJobs`, `/savedResources` | web `useSavedJobs.ts:98,150`; `frontend-core/src/saved/index.tsx:69,203-242` |
| `/users/{uid}/tracker[/{oppId}]` | web `useFirebaseTracker.ts:70,108,128`; mobile `firebaseTrackerDb.ts:29-117` |
| follows (DIVERGENT schemas: web `/followedCompanies/{slug}` vs mobile `/follows{tags,companies,contributors}`) | web `useFirebaseFollowedCompanies.ts:19,37,43`; mobile `firebaseFollowsDb.ts:28-78` |
| `/users/{uid}/alertPreferences` | web `(user)/alerts/page.tsx:65,74-77` |
| `/users/{uid}/interactions/{jobId}`, `/stats/{jobId}`, `/stats/global` | mobile `firebaseViewsDb.ts:43-144`; web admin dashboard `:174,190` aggregates them |
| `/comments/{jobId}` | mobile `firebaseCommentsDb.ts:45,87,119`; admin dashboard `:217` counts them |
| `/users/{uid}/feedback/...`, `/suggestedResources` | mobile `firebaseFeedbackDb.ts:29,73,110`, `firebaseResourcesDb.ts:47-61` |

Consequence for any "move off Firebase" plan: saves/tracker/follows/views/
comments have live client→RTDB write paths AND local-first caches
(`ff_local_saved_v1`, `ff_local_tracker_v1`, MMKV `fresherflow_feed_index`,
`ff:seen_job_ids`). Migration = dual-write + backfill + cutover per path,
not a flag flip. The follows-schema divergence must be unified first.

---

## 7. Cloudflare role (CDN gate, not an API platform)

`apps/api/src/infrastructure/cloudflare/edgeWorker.ts:1-13,49-159`:

- Validates `?v=&sig=` (stable, web) or `?t=&sig=` (legacy 120 s bucket,
  mobile) with HMAC-SHA256 + constant-time compare (`:21-28`), fail-hard 500
  without secret (`:61-68`), 403 on drift > 300 s (`:107-122`).
- Protected prefixes: `/bootstrap-feed.min.json`,
  `/taken-usernames.min.json`, `/companies-directory.min.json`,
  `/categories/*` (`:76-84`); everything else passes through to R2.
- `v=` responses carry `public, max-age=31536000, immutable` (`:149-159`).
- Twin implementation in plain ES6 at `edgeWorker.js:16,29,65-70` for Worker
  compat. No `wrangler.toml` in repo. Only other "Cloudflare WAF" mentions
  refer to third-party ATS sites being scraped
  (`plugins/.../darwinbox.service.ts:40`), not our infra.

---

## 8. API design (Express)

Middleware order (`apps/api/src/index.ts:108-497`): request-id → httpLogger →
helmet → cookieParser → CORS allowlist (`credentials:true`, `:175-203`) →
body parsers + `express.static('public')` → observability → `/api` health →
readiness 503 gate → global rate limit (200/min IP; auth 500/15 m; register
100/h; session-check 5000/15 m, `:227-272`) → pre-CSRF public routes
(`/api/public` clicks/stats, `/api/cron`, `/api/pipeline`, `:273-278`) →
`csrfGate` → session limiters → static feed/sitemap file routes (`:318-422`)
→ user routes (`isUserMode`, `:424-453`) → admin routes behind
`restrictAdmin=ensureDomainHost` (`:455-474`) → 404 → Sentry → central
`errorHandler` (last). Do not reorder without re-testing auth/rate-limit/
logging per `apps/api/AGENTS.md`.

Routes live in `src/routes/` (thin + Zod), orchestration in
`src/application/`, data in `src/infrastructure/`; multi-table writes use
`prisma.$transaction`; heavy work (feed regen over budget, push/email/
Telegram, OG images, bulk ops) goes to BullMQ (`packages/queue`, worker entry
`src/worker.ts`). Feed publish entry: `application/opportunity/publish.ts:9`
→ `infrastructure/services/publish.service.ts:37-139`
(alerts fire-and-forget, granular tag invalidation, metadata append, OG
image). Queue payloads must stay small/serializable.

Public rate limits are mandatory on internet-reachable GET/POST (CodeQL rule);
`restrictAdmin` is domain-based — admin API misuse = check `getAdminHost()`.

---

## 9. Web data flow (Next.js App Router)

- Landing (`app/(public)/page.tsx:67-135`): server component,
  `revalidate=false` (on-demand via `revalidateTag`, `:64-65`), races
  `fetchFeedIndex()` + `fetchGovernmentFeed()` against a 200 ms timeout
  (15 s at build) and renders with defaults on miss (`:75-85`); derives
  `liveCount`/`companiesCount` (`:89-92`); below-fold sections are
  `dynamic()` with skeleton loaders (`:10-31`).
- `HeroSection` is a client leaf taking `{liveCount, companiesCount}`
  (`features/landing/HeroSection.tsx:8-13`); `LandingStats` re-fetches
  `${CDN_URL}/meta/stats.json` for freshness (`:28-37`) and `/api/stats` for
  Daily Visitors (`:50-68`, validated finite-number pick with yesterday
  fallback), animating all three with easeOutQuad 1500 ms. Never shows `0`
  for the third tile — `- -` placeholder instead.
- Two fetch systems: `lib/api/server-client.ts:42-111` (API base, forwards
  cookies only for private calls, `no-store` for
  `/api/auth,/admin,/alerts,/user,/profile,/account,/tracker,/feedback`,
  else `revalidate:1800`) vs `lib/api/cdnFeed.ts` (signed CDN, no cookies,
  `Origin: SITE_URL` only, infinite tagged cache). Public reads → CDN;
  private/mutating → server-client. Client code reads only `NEXT_PUBLIC_*`.
- Cache safety: user routes (`dashboard, profile, saved, alerts, settings,
  admin`) are `no-store`; public feed/category may be ISR with bounded
  revalidate; per-user mutations must not invalidate global feed tags;
  `app/api/revalidate/route.ts` bans hub paths from `revalidatePath` (slugs
  only) and uses `revalidateTag(tag,'max')`.

---

## 10. Mobile data flow (Expo)

Feed sync only through `utils/cache/syncModule.ts` (`:7,20,30,37,200,276-297`):
fetch `FEED_VERSION_URL` → sign (`cdnSignature.ts`, EAS secret) → axios →
MMKV (`utils/storage.ts:1-60`, id `fresherflow-storage`; keys
`fresherflow_feed_index`, `fresherflow_job_*`, `ff:seen_job_ids`, `ff_logo_*`).
States to verify per change: cold start, warm start, navigation, loading,
error, empty (root `AGENTS.md`). Client env: `EXPO_PUBLIC_*` only.

---

## 11. Pipeline (discovery → processor → API)

- `scripts/job-discovery` (Node ESM + Playwright; `AGENTS.md:5-27`): scheduled/
  manual; stages ATS discovery → aggregator discovery → verification → storage
  → notification (do not reorder). Output = candidates to R2. R2 holds visited-
  URL state (load at start, save at end). Validate:
  `pnpm --filter ./scripts/job-discovery typecheck`, `npx tsx index.ts --test`
  (no upload/Telegram).
- `scripts/job-processor` (`AGENTS.md:5-29`): input = discovery output
  (R2/Supabase `discovered_jobs`); consume supplied content → native ATS APIs
  → browser fallback; normalize (`src/normalizer.ts`, must match API +
  `packages/types`); submit to API; persist `processed_urls.json` in R2 (never
  commit). Never call an LLM. Validate:
  `pnpm --filter ./scripts/job-processor typecheck`,
  `npx tsx index.ts --input test-jobs.json --no-submit`.
- Feed regeneration starts from admin/publish flows, never from public
  frontend requests.

---

## 12. Decision guide (where new data goes)

| Data | Put it in | Not in |
|---|---|---|
| Users, profiles, jobs, saves, actions, alerts, ingestion, orgs, comments-of-record | Postgres (`schema.prisma`) | RTDB, R2, MMKV |
| Session/ephemeral UI, offline queue, seen/opened, recent keywords | MMKV / localStorage | Postgres |
| Realtime counters, live comments, tracker mirror (until migrated) | RTDB (current) with Postgres backfill plan | R2 |
| Public read snapshots, shards, sitemaps, `meta/stats.json`, `feed-version.json` | R2 via `StaticFeedService` | Direct DB reads from web |
| Files (resumes if added, logos, OG images, exports) | R2 via storage helpers (signed URLs) | Repo, inline props |
| Secrets | Server env / EAS secrets | `NEXT_PUBLIC_*`, `EXPO_PUBLIC_*`, git |

---

## 13. Known gaps (fix these before any re-platforming)

1. Publish→R2 refresh is commented out (`publish.service.ts:109-111`).
   Decide the trigger (call `scheduleRefresh`, enqueue worker, or cron) and
   dry-run feed regen before prod upload.
2. Company shards disabled (`staticFeed.service.ts:749-750`) while web still
   defines `GET_COMPANY_SHARD_URL`; category shards have no R2 producer in
   that file. Either produce or remove the consumer.
3. Follows schemas diverge (web vs mobile, §6). Unify before migration.
4. Saves/tracker dual-write (Prisma API + RTDB/local direct). Pick authority
   per path and reconcile.
5. `/api/stats` (edge analytics) has no in-repo producer/route; Express
   `/api/stats` and `/api/public/stats` are different things. Document owner
   before depending on it further.
6. No `packages/domain` yet; shared rules are scattered (API services,
   `packages/types`, `packages/utils`). Create it when touching legacy logic
   under `apps/api/src/domain` (do not add new code there).

---

## 14. Validation

```bash
pnpm typecheck
pnpm build
pnpm --filter ./apps/web typecheck
pnpm --filter ./apps/api typecheck
pnpm --filter ./apps/api build
pnpm db:generate   # after schema changes only; migrations/dbp push on request
```

Per-change checks: API route → 200/400/401/403 (+409/429 where applicable);
Prisma change → generate; web UI → route/loading/error/empty; mobile UI →
cold/warm/navigation/loading/error/empty; feed pipeline → dry-run first.
Never commit `.env`, service-account JSON, or token dumps.
