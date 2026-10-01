# API contract

The wire contract for `apps/api`. This is the standard every route must follow;
`packages/api-client` and all three clients depend on it.

Read the root [`AGENTS.md`](../AGENTS.md) first. The `apps/api` guide is
[`apps/api/AGENTS.md`](../apps/api/AGENTS.md).

## Error envelope

Every non-2xx response uses one shape:

```jsonc
{
  "error": {
    "code": "VALIDATION_FAILED",   // stable, machine-readable
    "message": "…",               // human text, may be reworded freely
    "requestId": "…",             // matches the X-Request-ID response header
    "details": []                 // optional, field-level validation issues
  }
}
```

Emit it with `sendError` from `apps/api/src/middleware/errorHandler.ts`:

```ts
import { sendError, ErrorCode } from '../middleware/errorHandler';

if (!title) {
    return sendError(res, 400, ErrorCode.VALIDATION_FAILED, 'Title is required', req.requestId);
}
```

`requestId` is globally typed on `Request`, so pass `req.requestId` directly.
The alternative — `throw new AppError(message, status)` — is preferred inside
handlers that do real work, because the central error handler derives `code`,
logs, and sanitizes for you. Use `sendError` for early direct returns.

`details` is for validation only. Pass field-level issues so a client can
highlight the offending input:

```ts
sendError(res, 400, ErrorCode.VALIDATION_FAILED, 'Invalid query parameters', req.requestId, err.issues);
```

### Error codes

Append-only. A client may branch on these; it must never parse `message`.

| Code | Status | Meaning |
|---|---|---|
| `VALIDATION_FAILED` | 400 | Body, query, or params failed validation |
| `BAD_REQUEST` | 400 | Malformed request, not a field error |
| `UNAUTHENTICATED` | 401 | Missing or invalid credentials |
| `FORBIDDEN` | 403 | Authenticated, wrong role or permission |
| `NOT_FOUND` | 404 | Resource or route does not exist |
| `CONFLICT` | 409 | Duplicate or state conflict |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `SERVICE_UNAVAILABLE` | 503 | Dependency down, or probe disabled |
| `INTERNAL` | 500 | Unexpected server fault |
| `DB_UNAVAILABLE` | 503 | Database genuinely unreachable |
| `DB_SCHEMA_OUT_OF_DATE` | 500 | Migration pending, not an outage |

`DB_UNAVAILABLE` and `DB_SCHEMA_OUT_OF_DATE` are deliberately distinct: the
first is retryable, the second is not, and conflating them made clients hammer
an unfixable error.

### Status codes

`400` for validation, not `422`. This is a deliberate repo decision, pinned by
`apps/api/src/__tests__/api-contract.test.ts`. `422` is a WebDAV holdover and
mobile clients branch on `4xx` generically anyway. The thing that actually
matters is `details`, not the status.

`401` for missing auth, `403` for insufficient role. Never swap them.

## Rate limiting

`express-rate-limit` is the library. `createRateLimiter` in
`apps/api/src/middleware/rateLimit.ts` is the shared factory for route-level
limits and keys on `req.ip`, which `app.set('trust proxy', 1)` resolves
correctly from one proxy hop.

Do not key on the raw `x-forwarded-for` header. It is client-supplied before it
reaches the proxy, so a caller can mint a fresh bucket per request by rotating
it — that bypassed every limiter built on the factory, including auth and OTP.

Rate limiters must send the standard envelope as their `message`, or the reason
is lost on the client:

```ts
message: { error: { code: 'RATE_LIMITED', message: 'Too many requests', requestId: 'rate-limit' } },
```

## Pagination

`parsePagination` and `buildPaginationMeta` in
`apps/api/src/utils/pagination.ts` are the shared helpers. Bounds: default 20,
max 100, max page 1000. Every offset-paginated list route parses through them
so limits cannot drift per route.

`buildPaginationMeta` currently emits both `pageSize` and `limit` for the same
value. That duplication is a compatibility shim for older admin routes; it
should be removed once those clients migrate.

Public search uses its own cursor-style contract (`hits`, `totalHits`,
`hasMore`) and is intentionally not offset-paginated. Do not unify the two
without a client migration.

## Caching

Public feed and category reads may be cached. Auth, profile, dashboard, admin,
saved, alerts, and any user-specific read use `no-store`. Personalized responses
set `Cache-Control: private, no-store` explicitly, because an authenticated
variant must never be served from a shared cache.

Cache keys and tags carry the smallest safe scope. Do not invalidate global feed
tags from a per-user mutation.

## Health and readiness

Three distinct surfaces, and they are not interchangeable:

| Route | Purpose | Touches dependencies |
|---|---|---|
| `GET /health` | Liveness | No |
| `GET /health/deep` | Diagnostics for humans | Yes, rate limited |
| `GET /api/ready` | Readiness probe | Yes |

`/health` must never touch a dependency, or a database blip restarts every
healthy instance. The graceful-shutdown contract in
`apps/api/src/utils/readiness.ts` drains in dependency order (http, redis,
database) and is pinned by a test.

## Conventions

- Resources are plural nouns; URLs nest at most two levels.
- Sub-resource state transitions may be actions (`POST /raw/:id/retry`,
  `PATCH /sources/:id`). RPC-shaped endpoints (`POST /opportunities/parse`,
  `POST /actions/:id/action`) are the exception and should be renamed.
- Validate body, params, and query before the handler uses them.
- Never trust a user ID from a body or query string; filter by `req.user.id`.
- Log detailed errors server-side with the request ID; return generic text to
  clients. Never return stack traces, raw Prisma messages, or secrets.
- Any route reachable from the internet needs a rate limit.

## Known gaps

Tracked, not yet fixed:

- **No OpenAPI spec.** `packages/api-client` plus the Zod schemas in
  `packages/types` are the de facto contract.
- **No version prefix.** There is no `/api/v1`, and no deprecation policy.
  A shipped mobile app has nowhere to go for the next breaking change.
- **List envelopes still differ** between public search, admin list, and
  `/summary`.
- **`adminCache` is an unbounded in-memory `Map`** keyed partly on
  `JSON.stringify(req.query)`, invalidated by substring match.

## Validation

```bash
pnpm --filter ./apps/api typecheck
pnpm --filter ./apps/api build
```

For any route change, also hit: success, validation error, unauthenticated, and
unauthorized paths, and confirm the response body uses the envelope above.
