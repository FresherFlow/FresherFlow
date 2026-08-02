# FresherFlow API agent guide

This file is for AI coding agents working in `apps/api`. Read the root `AGENTS.md` first.

## App profile

| Concern | Value |
|---|---|
| Runtime | Node.js |
| Framework | Express |
| Language | TypeScript, strict mode |
| Database | PostgreSQL through Prisma in `packages/database` |
| Cache | Redis through `packages/redis` |
| Queues | BullMQ through `packages/queue` |
| Auth | JWT and Firebase token verification |

## Architecture

| Layer | Path | Rule |
|---|---|---|
| Routes | `src/routes/` | Thin routing and Zod validation |
| Application | `src/application/` | Request orchestration |
| Infrastructure | `src/infrastructure/` | Prisma, Redis, storage, external services |
| Middleware | `src/middleware/` | Auth, rate limits, logging, errors |
| Cron | `src/cron/` | Scheduled idempotent jobs |
| Worker | `src/worker.ts` | BullMQ processors |

Routes and controllers do not contain business rules. Shared business rules belong in `packages/domain`. Database queries belong in infrastructure services.

## Middleware order

Middleware order in `src/index.ts` is production-critical.

1. Request ID
2. HTTP logging and observability
3. CORS and security headers
4. Cookie parsing if needed
5. Global rate limiting
6. Body parsing
7. Public routes
8. Auth middleware
9. Zod validation
10. Admin audit middleware for admin mutations
11. Route handlers
12. Not found handler
13. Error handler, last

Do not reorder middleware without testing auth, rate limits, request logging, and error responses.

## Auth and RBAC

| Middleware | Use |
|---|---|
| `optionalAuth` | Public route with optional personalization |
| `requireAuth` | User-specific route |
| `requireAdmin` | Admin-only route |
| `profileGate` | Routes requiring completed onboarding |
| Firebase auth middleware | Mobile Firebase token exchange |

Rules:

- User-owned queries must filter by `req.user.id`
- Do not trust user IDs from request bodies or query strings
- Admin routes require authenticated admin role checks
- Keep admin mutations audit-logged
- Return `401` for missing auth and `403` for insufficient role

## Zod and request contracts

- Validate body, params, and query before handlers use them
- Keep schemas close to route files unless shared
- Keep public request and response types in `packages/types`
- Expose frontend calls through `packages/api-client`
- Return consistent error envelopes from the error handler

## Prisma rules

- Import the shared Prisma client from `packages/database`
- Do not instantiate `PrismaClient` in route files
- Wrap multi-table writes in `prisma.$transaction`
- Keep transactions short and free of network calls
- Use pagination on list endpoints
- Avoid N+1 queries with `include`, `select`, or batched reads

## Feed generation and publish safety

Feed changes affect web, mobile, SEO, and notifications.

- `feedGenerator.service.ts` is the feed build entry point
- `staticFeed.service.ts` owns R2 upload and CDN versioning
- `publish.service.ts` owns publish orchestration
- Publish actions should enqueue or call the existing regeneration flow
- Do not regenerate feeds from public frontend requests
- Do not publish unapproved or rejected opportunities
- Keep feed generation idempotent
- Update feed version atomically with uploaded feed objects
- Treat duplicate publish requests as safe retries

## R2 and CDN policy

- Upload private objects only through approved storage helpers
- Public feed objects must use the expected CDN path and versioning
- Signed URLs must use the approved CDN signature helper
- Do not return raw R2 private URLs to clients
- Validate object keys and filenames before upload
- Do not log signed URLs, secret keys, or large feed payloads

## Worker offload policy

Request handlers must stay responsive.

Offload these tasks to BullMQ workers:

- Feed regeneration when it can exceed request latency budgets
- Push notifications
- Email
- Telegram posts
- Large metadata or Open Graph image generation
- Bulk admin operations

Queue payloads must be serializable, typed, and small. Store large data in the database or R2.

## Rate limiting

- Public unauthenticated routes need rate limits
- Auth routes need stricter limits
- Admin mutation routes need admin-specific limits
- Health checks can be lightweight, but deep checks must be protected
- Do not bypass rate limits for routes reachable from the internet

## Logging and errors

- Use structured logging with request IDs
- Log full server errors on the server only
- Return generic `500` messages to clients
- Do not expose stack traces, raw Prisma errors, JWT errors, or secret values
- Preserve useful `400`, `401`, `403`, `404`, `409`, and `429` responses
- Use one error envelope shape for API clients

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Prisma database connection |
| `REDIS_URL` | Redis and BullMQ |
| `JWT_SECRET` | JWT signing and verification |
| `FIREBASE_PROJECT_ID` | Firebase Admin SDK |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin SDK |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin SDK |
| `R2_ACCOUNT_ID` | Cloudflare R2 |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 |
| `R2_BUCKET_NAME` | Cloudflare R2 |
| `CDN_SIGN_KEY` | CDN signed URL generation |
| `TELEGRAM_BOT_TOKEN` | Optional Telegram notifications |

Never commit env files or service account dumps.

## Key files

| File | Purpose |
|---|---|
| `src/index.ts` | Express app setup and middleware chain |
| `src/worker.ts` | BullMQ worker entry |
| `src/middleware/auth.ts` | Auth and role middleware |
| `src/middleware/validate.ts` | Zod validation middleware |
| `src/middleware/errorHandler.ts` | Final error handler |
| `src/middleware/adminAudit.ts` | Admin mutation audit logging |
| `src/infrastructure/services/feedGenerator.service.ts` | Feed builder |
| `src/infrastructure/services/staticFeed.service.ts` | R2 feed upload and versioning |
| `src/infrastructure/services/publish.service.ts` | Publish orchestration |

## Security rules

- Parse dynamic URLs with `new URL()`, then validate protocol and hostname
- Do not use substring checks to trust domains
- Use `crypto.randomInt` for backend tokens and codes
- Avoid unsafe regex patterns on untrusted text
- Use CodeQL suppressions only on reviewed false positives
- Keep CSRF or origin checks for cookie-auth mutations
- Never log JWTs, cookies, signed URLs, or secrets

## Validation

For API changes, run:

```bash
pnpm --filter ./apps/api typecheck
pnpm --filter ./apps/api build
```

Also verify:

- Protected routes return `401` without credentials
- Admin routes return `403` for non-admin users
- Zod rejects malformed payloads with `400`
- Duplicate writes return or handle `409` correctly
- Rate-limited routes return `429`
- Multi-table writes use transactions
- Feed publish or regeneration changes run in a dry path before production use
