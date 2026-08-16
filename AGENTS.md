# FresherFlow agent guide

This file is for AI coding agents working in the FresherFlow monorepo. Read the app-level `AGENTS.md` before touching app code.

| Area | Guide |
|---|---|
| Web | `apps/web/AGENTS.md` |
| API | `apps/api/AGENTS.md` |
| Mobile | `apps/mobile/AGENTS.md` |
| Admin mobile | `apps/admin-mobile/AGENTS.md` |
| Job discovery | `scripts/job-discovery/AGENTS.md` |
| Job processor | `scripts/job-processor/AGENTS.md` |

## Core Principles

Always understand the user's actual objective before acting. 

Before making changes:
- inspect the existing project
- understand the current architecture
- reuse existing patterns
- avoid unnecessary changes

When implementing:
- make the smallest correct change
- verify the result
- test important paths
- don't claim something works without checking it

When uncertain:
- investigate rather than guessing

Prefer complete solutions over superficial answers.

## Project shape

FresherFlow is a production job and walk-in opportunity platform.

| Layer | Stack |
|---|---|
| Web | Next.js App Router, TypeScript, Tailwind CSS, Vercel |
| Mobile | Expo, React Native, TypeScript, MMKV |
| Admin mobile | Expo, React Native, internal admin operations |
| API | Node.js, Express, Zod, Prisma, Redis, BullMQ |
| Database | PostgreSQL via Prisma |
| Storage | Cloudflare R2 and CDN |
| Automation | Job discovery and processor scripts |

Use `pnpm`. Do not use `npm` or `yarn`.

## Source of truth

| Concern | Source |
|---|---|
| Database schema | `packages/database/prisma/schema.prisma` |
| Prisma client | `packages/database` |
| Shared request and response types | `packages/types/src/index.ts` |
| Frontend API wrappers | `packages/api-client/src/` |
| Business rules | `packages/domain` |
| Shared utilities | `packages/utils/src/` |
| Shared UI primitives | `packages/ui` |
| Bootstrap feed | Cloudflare R2 object behind the FresherFlow CDN |
| Mobile feed cache | `apps/mobile/src/utils/cache/syncModule.ts` and MMKV |
| Queue contracts | `packages/queue` |
| Redis clients | `packages/redis` |

## App boundaries

Keep boundaries hard:

- Frontend apps never import Prisma or `packages/database`
- Frontend apps call backend data through `packages/api-client`
- Frontend apps do not import from `apps/api`
- API routes validate input, then delegate to application or infrastructure services
- Business rules that can survive a backend rewrite belong in `packages/domain`
- Multi-table writes use `prisma.$transaction`
- Heavy work uses BullMQ workers, not request handlers
- Mobile feed data flows through `syncModule.ts` only
- Feed regeneration starts from admin or publish flows, not public frontend routes

Do not add new code under `apps/api/src/domain`. Move legacy logic to `packages/domain`, application services, or infrastructure as you touch it.

## Environment rules

Use raw `process.env` only on trusted server surfaces.

| Surface | Allowed env shape |
|---|---|
| Web client | `NEXT_PUBLIC_*` only |
| Web server | `API_URL`, server-only secrets, and `NEXT_PUBLIC_*` where needed |
| Expo mobile | `EXPO_PUBLIC_*` only in client code |
| API | Server-only env vars through `process.env` |
| Scripts | Server-only env vars through `process.env` |

Never commit `.env` files, secrets, service account JSON, token dumps, or generated credential files.

## Security and CodeQL rules

Write code that passes CodeQL without suppressing real issues.

| Risk | Rule |
|---|---|
| URL trust | Parse with `new URL()`, check `protocol` and `hostname`, never trust `includes()` on full URLs |
| Server-side request forgery | Validate dynamic outbound URLs before `fetch` or `axios`; add CodeQL and LGTM suppressions only for reviewed false positives |
| Regular expressions | Avoid nested quantifiers and overlapping whitespace on untrusted text |
| Randomness | Use `crypto.randomInt` on the backend; use Web Crypto or platform crypto on clients |
| Errors | Log detailed server errors, return generic client messages |
| Auth | Filter user-owned database queries by `req.user.id` |
| Cookies | Use `SameSite=Lax` or `SameSite=Strict`; validate origin or CSRF token for cookie-auth mutations |
| Workflows | GitHub Actions need explicit top-level `permissions` |
| HTML | Do not use regex as a security sanitizer |

### Additional CodeQL rules (preventing known violations)
| Risk | Rule |
|---|---|
| Incomplete URL substring sanitization | Never use `url.includes('domain.com')` for security checks. Always use `new URL(url).hostname === 'domain.com'` or `.endsWith('.domain.com')` |
| ReDoS (polynomial regex) | Before running a regex on untrusted input, add `if (input.length > 10000) return fallback;`. Avoid nested quantifiers on variable-length patterns |
| Bad HTML filtering | Never use regex to strip HTML for security. Use a proper allowlist sanitizer or `encodeHtml()` helper |
| Incomplete multi-char sanitization | When HTML-encoding, always replace `&` first, then `< > " '` in a single encoding function |
| SSRF | Validate outbound URLs with `new URL()`, check `protocol` and `hostname` against an allowlist. Never use `includes()` on the full URL string |
| Missing rate limiting | All public API routes (GET and POST) must have `express-rate-limit` middleware |
| Cert validation | Never set `rejectUnauthorized: false` or `NODE_TLS_REJECT_UNAUTHORIZED=0` in production code |
| Format string injection | Never interpolate user input directly into format strings, SQL, or URLs without encoding |

CDN and R2 URLs must use signed URL helpers. Do not expose raw private R2 object URLs.

## ISR and caching policy

Caching mistakes can publish stale or private data. Treat cache changes as production-risk changes.

- Public feed and category pages may use Incremental Static Regeneration (ISR) with bounded `revalidate`
- Auth, profile, dashboard, admin, saved jobs, alerts, and user-specific reads use `no-store`
- High-cardinality routes must not trigger broad tag invalidation
- Feed fetches must not use `no-store` unless debugging locally
- Do not invalidate global feed tags from per-user mutations
- Cache keys and tags must include the smallest safe scope
- Confirm public SEO pages never depend on request cookies or user identity

## Validation

Run validation from the repo root unless an app guide says otherwise.

```bash
pnpm typecheck
pnpm build
```

For scoped work, prefer the workspace command if it exists:

```bash
pnpm --filter ./apps/web typecheck
pnpm --filter ./apps/api build
```

Additional checks:

| Change | Extra validation |
|---|---|
| API route | Hit success, validation error, unauthenticated, and unauthorized paths |
| Prisma schema | Run `pnpm db:generate`; apply migrations or `db:push` only when requested |
| Web UI | Render route, loading state, error state, and empty state |
| Mobile UI | Verify cold start, warm start, navigation, loading, error, and empty states |
| Feed pipeline | Run dry-run or test mode before production upload |
| Docs only | Run a targeted search for mojibake and forbidden punctuation |

## Dirty worktree policy

Assume the worktree may contain user or teammate edits.

- Check status before edits when practical
- Do not revert files you did not change
- Keep edits scoped to the requested files
- Do not run destructive git commands unless the user explicitly asks
- If unrelated changes appear, leave them alone
- If related unowned changes block the task, ask before overwriting

## Design system

Read the app design system before frontend UI changes:

| App | Design system |
|---|---|
| Web | `apps/web/DESIGN_SYSTEM.md` |
| Mobile | `apps/mobile/DESIGN_SYSTEM.md` |
| Admin mobile | `apps/admin-mobile/DESIGN_SYSTEM.md` |

Use existing primitives before creating new components. Do not hardcode colors, spacing, fonts, or elevation values when tokens exist.

## Subagent guidance

Use subagents when the runtime supports them. Do not block the task if the runtime has no subagent tool.

| Role | Owns |
|---|---|
| `api-engineer` | `apps/api` routes, middleware, services, workers |
| `web-engineer` | `apps/web` pages, features, hooks, UI wiring |
| `mobile-engineer` | `apps/mobile` screens, navigation, MMKV, feed sync |
| `admin-engineer` | `apps/admin-mobile` moderation and operations workflows |
| `package-engineer` | Shared packages under `packages/*` |
| `pipeline-engineer` | `scripts/job-discovery` and `scripts/job-processor` |
| `ui-designer` | UI redesigns, design system polish, motion |
| `researcher` | Read-only codebase context |

When subagents are available, list active agents first, reuse matching roles, and give precise file paths and acceptance checks. When they are unavailable, proceed directly and keep the same ownership boundaries.

## High-risk files

| File | Risk |
|---|---|
| `packages/database/prisma/schema.prisma` | Schema changes affect every app |
| `packages/types/src/index.ts` | Type changes cascade to all clients |
| `packages/api-client/src/` | Frontend and backend contract |
| `apps/api/src/index.ts` | Middleware order affects all requests |
| `apps/mobile/src/navigation/RootNavigator.tsx` | Launch and auth routing |
| `apps/mobile/src/utils/cache/syncModule.ts` | Offline feed sync |
| `scripts/job-discovery/src/pipeline/state.ts` | Discovery state contract |

## Implementation plans for other agents

Plans must be executable without broad searching. Include exact files, symbols, and validation commands. Do not invent line numbers. Use line numbers only after verifying them in the current worktree.
