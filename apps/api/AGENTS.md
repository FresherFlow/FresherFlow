# FresherFlow API — AI Agent Guide

This file is for AI coding agents only.
Use it as the implementation playbook for building and modifying the API backend (`apps/api`).

For monorepo-wide rules, architecture, and shared patterns, read the root [`AGENTS.md`](../../AGENTS.md) first.

---

## 1) App Snapshot

- Framework: Node.js + Express
- Language: TypeScript (strict)
- Database: PostgreSQL via Prisma ORM (`packages/database`)
- Cache: Redis (`packages/redis`)
- Queues: BullMQ (`packages/queue`)
- Auth: JWT + Firebase token verification
- Architecture: Routes → Controllers → Services → Domain/Infrastructure

## 2) Architecture (Do Not Bypass)

### Layers

- **Routes** (`src/routes/`): Express routers — thin, validation only
- **Controllers/Application** (`src/application/`): Request/response orchestration — keep thin
- **Domain** (`src/domain/`): Core business logic — pure, no Express dependency
- **Infrastructure** (`src/infrastructure/`): Database queries (Prisma), external service clients
- **Middleware** (`src/middleware/`): Auth, rate limiting, logging, error handling
- **CRON** (`src/cron/`): Scheduled background jobs
- **Worker** (`src/worker.ts`): BullMQ job processor entry

### Rules

- Controllers must be thin — no business logic. Delegate to domain services.
- Domain layer must not import Express types (`Request`, `Response`).
- All database queries live in `src/infrastructure/` — never inline Prisma calls in controllers.
- All route payloads must be validated with Zod via `src/middleware/validate.ts`.
- Wrap all multi-table writes in Prisma transactions.

## 3) Initialization & Configuration Map

**Read this before searching the codebase.** These are the exact files where key things are set up.

| What | File | Notes |
|---|---|---|
| Express app setup + middleware chain | `src/index.ts` | All middleware registered here in order — **do not reorder** |
| BullMQ worker entry | `src/worker.ts` | Processor registrations live here |
| Prisma client instance | `packages/database/src/client.ts` | Singleton — import from here, never create a new `PrismaClient` |
| Redis client | `packages/redis/src/index.ts` | Shared Redis instance |
| Queue definitions | `packages/queue/src/index.ts` | All BullMQ queue names and job type definitions |
| Auth middleware | `src/middleware/auth.ts` | `requireAuth`, `requireAdmin`, `optionalAuth` |
| Zod validation middleware | `src/middleware/validate.ts` | `validate(schema)` — wraps request body/query validation |
| Rate limiter | `src/middleware/rateLimit.ts` | Global rate limit config |
| Admin rate limiter | `src/middleware/adminRateLimit.ts` | Stricter limits for admin routes |
| Admin audit logger | `src/middleware/adminAudit.ts` | Auto-logs admin mutations — do not remove from admin routes |
| Error handler | `src/middleware/errorHandler.ts` | Must stay as **last** middleware in `src/index.ts` |
| CRON jobs | `src/cron/` | Registered in `src/index.ts` on startup |
| Firebase admin SDK | `src/middleware/firebaseAuth.ts` | Used for verifying Firebase ID tokens from mobile |
| Profile completeness gate | `src/middleware/profileGate.ts` | Blocks incomplete profile from protected endpoints |

### Environment Variables (API)

| Variable | Where used | Required |
|---|---|---|
| `DATABASE_URL` | Prisma connection | Yes |
| `REDIS_URL` | Redis connection | Yes |
| `JWT_SECRET` | Token signing/verification | Yes |
| `FIREBASE_PROJECT_ID` | Firebase admin SDK | Yes |
| `FIREBASE_CLIENT_EMAIL` | Firebase admin SDK | Yes |
| `FIREBASE_PRIVATE_KEY` | Firebase admin SDK | Yes |
| `R2_ACCOUNT_ID` | Cloudflare R2 | Yes (for feed/logo uploads) |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 | Yes |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 | Yes |
| `R2_BUCKET_NAME` | Cloudflare R2 | Yes |
| `CDN_SIGN_KEY` | CDN signed URL generation | Yes |
| `TELEGRAM_BOT_TOKEN` | Telegram notifications | No (optional) |

---

## 4) Key Routes and Files

### Route files

| Route file | Prefix | Purpose |
|---|---|---|
| `auth.ts` | `/api/auth` | Login, register, refresh token |
| `profile.ts` | `/api/profile` | User profile CRUD |
| `dashboard.ts` | `/api/dashboard` | Feed, stats for users |
| `opportunities.ts` | `/api/opportunities` | Job listing reads |
| `saved.ts` | `/api/saved` | Save/unsave opportunities |
| `alerts.ts` | `/api/alerts` | Job alert subscriptions |
| `resources.ts` | `/api/resources` | Study resources |
| `feedback.ts` | `/api/feedback` | User feedback |
| `follows.ts` | `/api/follows` | Follow/unfollow companies |
| `referrals.ts` | `/api/referrals` | Referral system |
| `username.ts` | `/api/username` | Username check/set |
| `deviceToken.ts` | `/api/device-token` | Push notification tokens |
| `actions.ts` | `/api/actions` | User actions (apply, share) |
| `admin/` | `/api/admin` | Admin-only routes |
| `pipeline/` | `/api/pipeline` | Job ingestion pipeline endpoints |
| `public/` | `/api/public` | Unauthenticated public endpoints |

### Middleware stack (order matters)

- `requestId.ts` — attaches unique request ID
- `httpLogger.ts` — structured HTTP logging
- `observability.ts` — Sentry/tracing
- `cors` — CORS headers
- `rateLimit.ts` — global rate limiter
- `auth.ts` — JWT verification (`requireAuth`)
- `validate.ts` — Zod schema validation
- `adminAudit.ts` — audit log for admin mutations
- `errorHandler.ts` — global error handler (last in chain)

### Key files

- `src/index.ts` — Express app setup and middleware chain — **high risk**
- `src/worker.ts` — BullMQ worker initialization
- `src/middleware/auth.ts` — `requireAuth` and `requireAdmin` middleware
- `src/middleware/errorHandler.ts` — global error handler

## 5) Key Services & Utilities

**Check these before building anything new.** Most domain logic already exists as a service.

### Domain Services (`src/domain/`)

| Service | File | What it does |
|---|---|---|
| `feedGenerator.service.ts` | `src/domain/feed/feedGenerator.service.ts` | Builds the bootstrap feed JSON from approved DB rows. **Entry point for all feed generation.** |

### Infrastructure Services (`src/infrastructure/services/`)

| Service | File | What it does |
|---|---|---|
| `staticFeed.service.ts` | `src/infrastructure/services/staticFeed.service.ts` | Uploads generated feed to R2, manages CDN versioning |
| `publish.service.ts` | `src/infrastructure/services/publish.service.ts` | Orchestrates opportunity publish flow — triggers feed regen |
| `profile.service.ts` | `src/infrastructure/services/profile.service.ts` | All user profile logic — completion score, update, get |
| `auth.service.ts` | `src/infrastructure/services/auth.service.ts` | JWT creation, refresh, Firebase token exchange |
| `notification.service.ts` | `src/infrastructure/services/notification.service.ts` | Push notification dispatch logic |
| `alerts.service.ts` | `src/infrastructure/services/alerts.service.ts` | Job alert matching and dispatch |
| `email.service.ts` | `src/infrastructure/services/email.service.ts` | Transactional email sending |
| `telegram.service.ts` | `src/infrastructure/services/telegram.service.ts` | Telegram channel posting, caption generation |
| `metadata.service.ts` | `src/infrastructure/services/metadata.service.ts` | Opportunity metadata enrichment (OG, schema.org) |
| `ogImage.service.ts` | `src/infrastructure/services/ogImage.service.ts` | Open Graph image generation |
| `company.service.ts` | `src/infrastructure/services/company.service.ts` | Company record lookup and management |
| `storage.service.ts` | `src/infrastructure/services/storage.service.ts` | R2 upload helpers |
| `feedCache.service.ts` | `src/infrastructure/services/feedCache.service.ts` | Redis feed cache read/write |
| `publicOpportunityCache.service.ts` | `src/infrastructure/services/publicOpportunityCache.service.ts` | Redis cache for public opportunity reads |
| `walkin.service.ts` | `src/infrastructure/services/walkin.service.ts` | Walk-in specific logic |
| `adminMetrics.service.ts` | `src/infrastructure/services/adminMetrics.service.ts` | Dashboard metrics aggregation |

### Shared Utilities (`packages/utils/`)

| Utility | Import | What it does |
|---|---|---|
| `slugify()` | `@fresherflow/utils` | URL slug generation from company/role names |
| `fingerprint()` | `@fresherflow/utils` | Dedup fingerprint for job URLs |
| `academicNormalization` | `@fresherflow/utils` | Normalize degree/branch strings |
| `skillNormalization` | `@fresherflow/utils` | Normalize skill names |
| `urlNormalization` | `@fresherflow/utils` | Clean/normalize apply URLs |
| `profileCompletion()` | `@fresherflow/utils` | Calculate profile completeness % |
| `domains.ts` | `@fresherflow/utils` | ATS domain detection, domain utilities |

---

## 6) Standard Workflows

### Add a new endpoint

1. Define request/response types in `packages/types/src/index.ts`.
2. Create Zod validation schema — add to route file or `src/middleware/validate.ts`.
3. Add route in the relevant file under `src/routes/`.
4. Add controller function in `src/application/`.
5. Add business logic in `src/domain/` if complex, or Prisma query in `src/infrastructure/`.
6. Expose typed wrapper in `packages/api-client/src/`.
7. Protect with `requireAuth` if user-specific. Add `requireAdmin` for admin routes.

### Add a new background job

1. Define job type and payload in `packages/queue/`.
2. Add BullMQ producer call where the job is triggered (e.g. after publish).
3. Add processor function in `src/worker.ts` or `apps/worker/src/`.
4. Test job enqueue and processing locally before deploying.

### Add a new CRON job

1. Add new file under `src/cron/`.
2. Register it in `src/index.ts` CRON initialization block.
3. Keep CRON jobs idempotent — they may run multiple times.

## 7) Auth and Permission Rules

- `requireAuth` — verifies JWT, attaches `req.user`
- `requireAdmin` — verifies `req.user.role === 'admin'`
- `profileGate` — ensures user has completed onboarding profile
- `firebaseAuth` — used for endpoints that accept Firebase ID tokens (mobile auth flows)
- All user-specific queries must filter by `req.user.id` — never trust client-supplied user IDs.

## 8) Performance Guardrails

- Never do expensive synchronous computation on the main event loop.
- Offload: email sending, push notifications, feed regeneration → BullMQ worker.
- Paginate all array responses — default limit 20, max 100.
- Use Redis cache for frequently read, rarely mutated data (job listings, categories).
- Avoid N+1 queries — use Prisma `include` or batch queries.

## 9) High-Risk Files (Edit Carefully)

- `src/index.ts` — middleware chain order matters; wrong order breaks auth/logging for all routes
- `src/middleware/auth.ts` — auth regression breaks all protected routes
- `src/middleware/errorHandler.ts` — must remain last in chain; changes affect all error responses
- `src/worker.ts` — BullMQ processor init; regressions break background jobs

## 10) API-Specific Post-Change Checks

Run `pnpm typecheck` + `pnpm build` (see root AGENTS.md). Then also:

- Verify protected routes return `401` without a valid token.
- Verify admin routes return `403` for non-admin users.
- Verify Zod validation rejects malformed payloads with a `400`.
- Verify no unhandled promise rejections in logs.
- Verify multi-table writes are wrapped in transactions.

