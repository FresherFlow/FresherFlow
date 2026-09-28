# Launch readiness audit — 2026-09-28 (web scope)

Read-only audits (API surface, DB load, Firebase, CDN coverage). Mobile app
excluded from scope — web launch only. All claims carry `file:line` evidence.
No code was changed.

## Verdict: do not launch until the 5 must-fix items ship

| # | Must-fix | Why it kills launch | Owner area |
|---|---|---|---|
| 1 | Pool config: set `max`, add PgBouncer/pooler, add statement timeout (`packages/database/src/index.ts:13-19` — zero pool params today) | Default pool (10) × 3–4 queries per feed/detail/search request × feed fan-out (600 rows, 7 relations) saturates; then even `requireAuth`'s per-request check queues | DB |
| 2 | Unindexed hot counts + unbounded lists: `UserAction(opportunityId, actionType)` 2× per detail view with zero index (`detail.ts:102-105`); `groupBy=company` has no pagination (`feed.ts:130-135`); `GET /saved` has no pagination (`saved.ts:95-118`) | Sequential scans + unbounded pulls under crawler/curious-user load | DB |
| 3 | Web admin whole-tree RTDB listeners (`FeedbackClient.tsx:182,244`, `OverviewTab.tsx:185,212`) | Each open admin tab downloads entire `/users` + `/comments` + `/stats` trees and re-fires on every write underneath — dominates RTDB download quota | Firebase/RTDB |
| 4 | Slug-page multi-megabyte fan-out + live search per keystroke | `/jobs/[slug]` pulls shard + bootstrap + government + expired in parallel per cold render (`opportunitySeo.ts:122-132`) plus full index twice for the registry (`jobs/[slug]/page.tsx:159-160,206-217`); search fans out to ingestion scrapers per debounced keystroke with no result cache — search the in-memory CDN index first instead | CDN/API |
| 5 | Missing per-route limiters + write-on-GET endpoints | All of `/api/alerts/*`, `/api/actions/*`, `/api/profile/*` (except publish), `/api/follows/*`, `/api/feedback`, `GET /api/auth/permissions` run on the global limiter only; `GET /api/alerts/preferences` upserts on read; profile-view upserts on GET (`profiles.ts:293`) | API |

## Per-user daily budget, web only (assumptions stated; tune with analytics)

Web user (1 cold load + 5 views + 1 search, `FEED_SOURCE=cdn`): **~6–7 CDN hits, ~2–5 edge-cached proxy hits, ~0–2 DB-backed** (0 without search). Warm users pay ~0 (Next data cache + immutable `?v=` URLs); each page view adds ~1 edge-cached hit. Profile/recruiters/community/search add 1+ DB-backed hits per interaction (bypass list below).

## API surface

- Global limiter 200 req/min/IP (`apps/api/src/index.ts:259`); feed/search/detail/sync/clicks carry per-route limiters. Gaps (global-only) listed in must-fix #5.
- Public endpoints doing DB writes: guest job submit (DRAFT+PENDING_REVIEW), click tracking, referral clicks, intro-requests (3 writes), alerts-preferences upsert-on-GET, profile-view upsert.
- Polling: unread bell every 15 min + 120s-cooldown focus refresh. No backend polling loops.
- Dead bindings: `growthApi.trackEvent` has no server handler; `GET /api/saved` + `GET /api/dashboard/highlights` have no callers (Firebase/CDN replaced them — load credit).

## DB load

- Per-request queries: guest feed 1, authed feed 3 (parallel), detail 1–4, search 2–4, notifications 3, auth me 2–3, community feed 2, rooms 3–5, alerts feed 4–5.
- Pagination: feed default 50/max 200/page-cap 50; search 20/50/offset-cap 5000 (best in repo); community 20/50 with uncapped deep skip; unbounded: `groupBy=company`, `GET /saved`.
- Transactions: all short, DB-only; no network inside `$transaction` on hot paths.
- Singleton PrismaClient via `globalForPrisma` — correct. Extra pools exist only off-request (ingestion, pipeline, search script).
- Indexes: feed/search/slug/notifications/saved/rooms covered. Missing: `UserAction(opportunityId, actionType)`, `CommunityPost.tags` Gin, `title/body` trigram, composite `(userId, channel, sentAt)` on AlertDelivery.

## Firebase, web-side only

- OTP is backend email OTP (0 Firebase). Google login is a no-cost MAU op. Token verification happens only at handshake, never per API call.
- RTDB burn: per-user listeners (saved/tracker/follows) re-download whole subtrees per write; whole-map `set` per saved-toggle; per-view increments; web admin whole-tree listeners (must-fix #3).
- FCM is no-cost (600k/min throttle). Admin broadcast uses a single multicast (breaks past 500 tokens — chunk it). Campaign function scans full `/users` per campaign — prefer subscribed topics.
- Functions are Blaze-gated — deploying forces plan upgrade.
- Zero use: Firestore, Storage, Crashlytics, Analytics, Remote Config.

## CDN coverage, web

- CDN-served: landing, all hubs, detail pages, companies (hourly ISR), walk-in cities (static-only), blog/static.
- Live-API bypasses (ranked): `/u/[username]` SSR per 60s window; `/recruiters` + `/community` pure-client DB reads; live fan-out search per keystroke; `/r/[code]` no-store write per open; `/jobs/[slug]` fan-out per cold render; `/api/public/job` full-bootstrap scan per pane-open (use the shard).
- No edge purge exists — invalidation is version-bump only (tag + manifest fixes confirmed present).

## Free-tier survival math (multiply by launch targets)

- Postgres: pool 10 with ~3 Q/req hot paths → fix pool + indexes + unbounded lists first (must-fix #1, #2).
- RTDB: 10 GB/mo download — admin whole-tree listeners are the multiplier to cut (must-fix #3).
- Auth: 50k MAU fine; web OTP costs email-provider sends, not Firebase.
- FCM/Functions: no-cost until scale; Functions needs Blaze to deploy.
- R2/edge: immutable versioned snapshots scale cheaply; origin egress is driven by slug fan-out (must-fix #4).
