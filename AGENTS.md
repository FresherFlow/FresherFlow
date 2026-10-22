# FresherFlow agent guide

## Start here

This file is the repo-wide source of truth. Read the app-level `AGENTS.md` before touching that app's code.

| Area | Guide |
|---|---|
| Web | `apps/web/AGENTS.md` |
| API | `apps/api/AGENTS.md` |
| Mobile | `apps/mobile/AGENTS.md` |
| Admin mobile | `apps/admin-mobile/AGENTS.md` |
| Job discovery | `scripts/job-discovery/AGENTS.md` |
| Job processor | `scripts/job-processor/AGENTS.md` |
| MCP server | no app guide yet — see the MCP section below |

Tooling and workflow notes live in `docs/skills/` (`pnpm.md`, `turborepo.md`, `prisma.md`, `nextjs.md`, `expo.md`, `git-commit.md`, `security-review.md`). Dated architecture reviews live in `docs/reviews/<date>-<slug>/`.

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
| MCP | Node.js, Express, MCP Streamable HTTP, OAuth 2.1 bearer, read/write over the API |
| Worker | BullMQ processors run as a separate process (`apps/api/src/worker.ts`) |
| Ingestion | Feed and job ingestion (`apps/ingestion`) |
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
| Business rules | API application and infrastructure services, with pure helpers in `packages/utils` and `packages/types`. There is no `packages/domain`; do not create one |
| Shared utilities | `packages/utils/src/` |
| Shared UI primitives | `packages/ui`, `packages/frontend-core` |
| Parsing / ingestion logic | `packages/parser`, `apps/ingestion` |
| Bootstrap feed | Cloudflare R2 object behind the FresherFlow CDN |
| Mobile feed cache | `apps/mobile/src/utils/cache/syncModule.ts` and MMKV |
| Queue contracts | `packages/queue` |
| Redis clients | `packages/database/src/redis.ts`, re-exported by `packages/database/src/index.ts` |
| Listing contract | `apps/api/src/utils/validation.ts` → `opportunitySchema` |
| Shipped agent skills | `plugins/fresherflow/skills/<name>/SKILL.md` |

### One home per fact

This file is the only home for repo-wide facts. The table above names the owning source for each concern.

- A fact that applies to more than one app is stated once, here.
- An app guide or script guide states only what is specific to it, and links here for the rest, using a relative path such as `../../AGENTS.md`.
- Never restate a repo-wide rule in an app guide. If the same rule appears in two guides, keep it here and delete the copy.
- A rule that must never be missed belongs in this file, because app and script guides are not always loaded. Only root `AGENTS.md` and `CLAUDE.md` are reliably in context.

When a repo-wide fact changes, only this file needs editing. To prove it is not restated elsewhere:

```bash
grep -rn "<the phrase you changed>" AGENTS.md apps/*/AGENTS.md scripts/*/AGENTS.md
```

The command must return this file only.

## App boundaries

Keep boundaries hard:

- Frontend apps never import Prisma or `packages/database`
- Frontend apps call backend data through `packages/api-client`
- Frontend apps do not import from `apps/api`
- API routes validate input, then delegate to application or infrastructure services
- Business rules that can survive a backend rewrite belong in an API application or infrastructure service, or as pure helpers in `packages/utils` and `packages/types`
- Multi-table writes use `prisma.$transaction`
- Heavy work uses BullMQ workers, not request handlers
- Mobile feed data flows through `syncModule.ts` only
- Feed regeneration starts from admin or publish flows, not public frontend routes

Do not add new code under `apps/api/src/domain`. Move legacy logic to an application service, infrastructure, or a pure helper in `packages/utils` as you touch it.

### Listing writes have one home

Any code that writes a full listing — the admin form, draft ingester, or MCP — goes through `apps/api/src/application/opportunity/listingWrite.ts`. Pure payload builders (slug resolution, education normalisation, drive/government row construction) live in `listingPayload.ts`.

Do not inline a `prisma.opportunity.create` or `.update` in a route to add a field. That duplication is what let the MCP path drift from the admin contract in the first place.

Two traps in this area:

- `opportunitySchema` is a **closed** `z.object`. Unknown keys are stripped, not rejected, so a misspelled field disappears silently. `AdminOpportunityRequest` in `apps/api/src/types/admin.ts` must mirror it; when the interface and the schema diverge, the interface is the thing that is wrong.
- `applicationDetails` is a Prisma `Json` column. Setting it to bare `null` throws at runtime and 500s — use `Prisma.DbNull`.

## MCP server

`apps/mcp` is a thin Express server over the API. It holds no business logic and no database access; every tool is an HTTP call.

| Concern | Where |
|---|---|
| Tool registration and the session `instructions` block | `apps/mcp/src/server.ts` |
| One file per tool | `apps/mcp/src/tools/*.ts` |
| HTTP transport, OAuth bearer gate | `apps/mcp/src/transport.ts` |
| Caller role → which tools exist (cached briefly) | `apps/mcp/src/identity.ts` |
| The one authenticated API fetch and error mapping | `apps/mcp/src/http/client.ts` |
| API calls, one module per surface | `apps/mcp/src/api/{identity,jobs,listings,submissions}.ts` |
| Backend routes | `apps/api/src/routes/internal/mcp/` |
| Backend auth for that surface | `apps/api/src/middleware/mcpAccessToken.ts` |
| OAuth issuance | `apps/api/src/routes/oauth.ts` |

Every MCP caller is authenticated through the app. There is no anonymous tier, and the MCP server holds no service key of its own:

| Caller | Credential | Can do |
|---|---|---|
| Signed-in user via AI client | OAuth 2.1 bearer | browse live jobs; submit a **DRAFT**; own submissions |
| Moderator via AI client | OAuth 2.1 bearer + `opportunity.publish` | the above, **published on submit**; full listing writes; moderation |
| Pipeline scripts (direct to the API) | `INTERNAL_API_SECRET` | full listing writes; no user identity |

Role is resolved from the same RBAC grants the admin panel edits (`apps/api/src/application/mcp/identity.ts`), never from a client claim. `apps/mcp/src/transport.ts` resolves it per request, so the tool list a connection sees already reflects its role.

`mcpSurfaceAuth` accepts a bearer *or* the service key and never falls back to anonymous; `apps/mcp` itself refuses any request without a bearer. Listing writes need `opportunity.create` **or** `opportunity.edit` (moderators hold `edit`), so the listing tools bypass the admin router rather than impersonating a super admin.

`create_listing` defaults to `PUBLISHED` for a moderator connection and `DRAFT` for the service key. `submit_opportunity` publishes only when the account holds `opportunity.publish`. A tool must never report a listing as live unless the response says `published: true`.

MCP clients cache the tool list. After changing any `inputSchema` or `outputSchema`, reconnect or refresh discovery or clients validate against the stale schema and reject valid results.

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

## Tooling rules

Use the dedicated tools for reading and searching. They are faster, they respect ignore rules, and their output is directly citable.

**Do not, for code search or reading:**

- `Select-String`, `Get-Content`, `Get-ChildItem` pipelines for finding or reading source
- multi-clause PowerShell one-liners that string-match source
- re-reading a file the `read` tool already returned in full

**Use instead:**

| Task | Tool |
|---|---|
| find a symbol or string | `grep` |
| read a file, or a range of one | `read` |
| find a file by name | `glob` |
| edit | `edit` |
| create a file | `write` |
| plan or audit across many files | `subagent` with `explore` |

**`shell` is for shell work only:** `git`, `pnpm`, builds, tests, migrations, starting or stopping processes, inspecting ports. It is not a search tool. This box is Windows, so it runs PowerShell, not bash.

If a shell command grows past roughly one pipeline, it belongs in `grep` or `subagent`. Chained pipelines are slow, unreadable, and hide their own mistakes.

## Validation

CI runs this order (`.github/workflows/deploy.yml`). Match it locally:

```bash
pnpm install --frozen-lockfile
pnpm db:generate                 # postinstall deliberately skips this
pnpm turbo lint --filter=fresherflow-api --filter=fresherflow-web
pnpm turbo typecheck --filter=fresherflow-api --filter=fresherflow-web
pnpm turbo build --filter=fresherflow-api --filter=fresherflow-web
pnpm --filter fresherflow-api test
```

`postinstall` echoes "skipping prisma generate". After any `schema.prisma` change you must run `pnpm db:generate` yourself or typecheck fails on stale Prisma types. turbo's `typecheck` and `test` tasks depend on `^build` and `db:generate` respectively, but not on your local invocation of `pnpm typecheck`.

For a single app or file:

```bash
pnpm --filter fresherflow-api typecheck
pnpm --filter fresherflow-api exec vitest run src/__tests__/mcp-listing-write.test.ts
pnpm --filter fresherflow-mcp typecheck
pnpm --filter fresherflow-web check:structure:gate
```

`apps/mcp` has no `test` script and no test files; MCP behaviour is covered by API tests over the write path it calls.

Additional checks:

| Change | Extra validation |
|---|---|
| API route | Hit success, validation error, unauthenticated, and unauthorized paths |
| Prisma schema | Write the migration and run `pnpm db:generate`. Applying it needs explicit approval |
| Listing write path | `src/__tests__/mcp-listing-write.test.ts` asserts the exact object handed to Prisma |
| MCP tool schema | Reconnect a client and re-run `tools/list` before trusting a result |
| Agent skill | Edit under `plugins/fresherflow/skills/`, then `pnpm skills:sync`; `pnpm skills:check` fails on drift |
| Web UI | Render route, loading state, error state, and empty state |
| Mobile UI | Verify cold start, warm start, navigation, loading, error, and empty states |
| Feed pipeline | Run dry-run or test mode before production upload |

### Agent skills

`plugins/fresherflow/skills/<name>/SKILL.md` is the tracked source and what ships in the plugin bundle. `.agents/skills/` is the local install and is gitignored, so it can never be the source. Edit the file under `plugins/`, then run `pnpm skills:sync`. The frontmatter `name` must match the directory name — a mismatch silently breaks discovery.

Skills and MCP are separate channels. A skill is markdown loaded by whoever runs the agent; the MCP server can only deliver `instructions` and the tool list over the protocol. Tool names quoted in a skill are load-bearing — keep them in sync with `server.ts`.

### Turborepo workflow

- Before editing `packages/*` or other cross-cutting files, check the blast radius first:

```bash
npx turbo query affected --packages --base main
```

- Architecture boundaries are mechanically checked (advisory, not CI-blocking) with `npx turbo boundaries`. Tag rules live in root `turbo.json` under `boundaries.tags`: packages tagged `client-ui` (mobile, admin-mobile, ui, frontend-core) must not depend on packages tagged `server-only` (`@fresherflow/database`, `@fresherflow/queue`), and vice versa (`server-only` must not be imported by `client-ui`). Per-package tags are declared in each package's own `turbo.json`. `types`, `constants`, `utils`, and `api-client` are deliberately untagged: they are shared-neutral and both sides legitimately depend on them. It also reports imports of undeclared dependencies; known findings exist in `apps/web` and `dist/` output noise — treat new src-level findings as regressions.

## Dirty worktree policy

Assume the worktree may contain user or teammate edits.

- Check status before edits when practical
- Do not revert files you did not change
- Keep edits scoped to the requested files
- Do not run destructive git commands unless the user explicitly asks
- If unrelated changes appear, leave them alone
- If related unowned changes block the task, ask before overwriting

### Git write policy

Editing files is the job. Git state is not, unless the user asks for it.

**Do not, without an explicit request:**

- `git add` / `git stage` — do not stage, even "just the files I touched"
- `git commit`, `git commit --amend`
- `git push`, `git checkout`, `git switch`, `git restore`, `git reset`
- `git stash`
- create branches, tags, or worktrees
- `git pull`, `git merge`, `git rebase`
- run `prisma migrate deploy` / `db:push` against any database
- start or stop background services without being asked

Staging by habit is still a write. "I only staged, I did not commit" is not an
excuse — the user decides what enters the index.

**Allowed by default:** read-only git (`status`, `diff`, `log`, `show`).

**Migrations** are schema changes to a real database. Write the migration file,
run `db:generate`, and say plainly that the migration is not applied. Applying
it is a separate, explicit approval.

**Reporting:** when work is done, name the files changed and say they are left
unstaged. If the user wants them staged, they will say so.

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
| `apps/api/src/utils/validation.ts` | `opportunitySchema` is the listing contract; a closed object silently strips unknown keys |
| `apps/api/src/application/opportunity/listingWrite.ts` | Every listing write on every path |
| `packages/database/prisma/schema.prisma` | Schema changes affect every app |
| `packages/types/src/index.ts` | Type changes cascade to all clients |
| `packages/api-client/src/` | Frontend and backend contract |
| `apps/api/src/index.ts` | Middleware order and route mounts affect all requests |
| `apps/mcp/src/server.ts` | Tool registrations and session instructions |
| `apps/mobile/src/navigation/RootNavigator.tsx` | Launch and auth routing |
| `apps/mobile/src/utils/cache/syncModule.ts` | Offline feed sync |
| `scripts/job-discovery/src/pipeline/state.ts` | Discovery state contract |

## Implementation plans for other agents

Plans must be executable without broad searching. Include exact files, symbols, and validation commands. Do not invent line numbers. Use line numbers only after verifying them in the current worktree.
