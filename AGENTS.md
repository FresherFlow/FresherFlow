# FresherFlow - AI Agent Guide

This file is for AI coding agents only.
Use it as the primary implementation playbook for this monorepo.

For app-specific details, read the AGENTS.md inside the relevant app before touching it:
- Web → `apps/web/AGENTS.md`
- Mobile → `apps/mobile/AGENTS.md`
- Admin Mobile → `apps/admin-mobile/AGENTS.md`
- API → `apps/api/AGENTS.md`
- Job Discovery → `scripts/job-discovery/AGENTS.md`
- Job Processor → `scripts/job-processor/AGENTS.md`

---

## 1) Project Snapshot

- App type: Job & Walk-in Opportunity Platform
- Language: TypeScript (strict)
- Frontends: Next.js 16 App Router (Web), React Native + Expo (Mobile/Admin)
- Backend: Node.js, Express, BullMQ
- Database: PostgreSQL (Prisma ORM), Redis (cache + queues)
- CDN/Storage: Cloudflare R2 (bootstrap feed, logos, static assets)
- Architecture: Decoupled monorepo, DDD-influenced backend
- Package Manager: `pnpm` + Turborepo

## 2) Core Architecture (Do Not Bypass)

### Workspace Layers

- **Apps** (`apps/`): `web` (Next.js), `mobile` (Expo), `admin-mobile` (Expo), `api` (Express), `worker` (BullMQ)
- **Packages** (`packages/`): `ui`, `database`, `api-client`, `types`, `domain`, `parser`, `queue`, `redis`, `utils`

### Data Flow Rules

- Frontend apps never call Prisma directly — all data goes through `packages/api-client`.
- API layer: `routes/` (validation) → `application/` (orchestration) → `packages/domain` (business rules) → `infrastructure/` (Prisma, Redis, external services).
- Business rules live in `packages/domain` — never in routes, application layer, or infrastructure. If you can answer "would this logic move unchanged to a Go rewrite?", it belongs in `packages/domain`.
- `apps/api/src/domain/` is a legacy folder being eliminated — do not add new code there. Move existing code to `packages/domain` or `application/` incrementally.
- Wrap multi-table DB writes in `prisma.$transaction([...])`.
- Heavy work (email, push, feed regen) → BullMQ worker. Never block Express event loop.
- Bootstrap feed: mobile syncs via `apps/mobile/src/utils/cache/syncModule.ts` — do not bypass.
- Feed regeneration is triggered from admin panel or publish events — never from the frontend.

### Single Source of Truth

| What | Where |
|---|---|
| Database schema | `packages/database/prisma/schema.prisma` |
| Business rules | `packages/domain` |
| API types (request/response) | `packages/types/src/index.ts` |
| API client wrappers | `packages/api-client/src/` |
| Bootstrap feed | `cdn.fresherflow.in/bootstrap-feed.min.json` |
| Mobile state | `apps/mobile/src/store/` |
| Shared utilities | `packages/utils/src/` |

## 3) UI Design System Rules & Delegation

Each app has its own `DESIGN_SYSTEM.md`. Read it before touching any UI.

- Web → [`apps/web/DESIGN_SYSTEM.md`](apps/web/DESIGN_SYSTEM.md)
- Mobile → [`apps/mobile/DESIGN_SYSTEM.md`](apps/mobile/DESIGN_SYSTEM.md)
- Admin Mobile → [`apps/admin-mobile/DESIGN_SYSTEM.md`](apps/admin-mobile/DESIGN_SYSTEM.md)

Before building a new component, check `packages/ui` — it may already exist.

- **Free-Hand Creative Delegation**: When orchestrating or delegating UI design, UX redesigns, or front-end animations to subagents, **NEVER** give prescriptive layout instructions, step-by-step formatting blueprints, or micro-managed visual rules. Do not instruct subagents like a fresher suggesting to a CEO. Instead, explicitly instruct the subagent to load the relevant design skills (`wow-ui-design`, `emil-design-eng`, `apple-design`, `improve-animations`, etc.), define the target file or problem, and allow the subagent a completely **free hand** to exercise full creative judgment and design taste.

## 4) Job Matching and Feed

- Core matching: `packages/domain` → `calculateOpportunityMatch(profile, opportunity)`
- Scoring runs **client-side on mobile** after feed download — never move this to the API.
- Mobile sync flow: version check → signed URL → fetch → score → MMKV cache

## 5) Permissions and Authentication

- JWT-based. Protected API routes use `requireAuth` middleware.
- Web: auth via cookies. Mobile: auth via SecureStore.
- RBAC roles: `USER`, `ADMIN` (schema enum). `RECRUITER` will be added to the enum when the first recruiter feature ships — do not reference it until then.
- User-specific DB queries must always filter by `req.user.id` — never trust client-supplied IDs.

## 6) Naming and Organization

- Types/interfaces: `IUser`, `JobResponse`, `CreateJobPayload` — always in `packages/types`
- React Components: PascalCase (`JobCard.tsx`)
- Hooks: camelCase (`useAuth.ts`, `useFeed.ts`)
- API Controllers: `*Controller.ts`
- Files > ~600 lines → split into focused files
- Folders: kebab-case or camelCase — follow existing convention per app

## 7) Feature-Specific Implementation Guides

Read the linked guide **before starting** any of these tasks.

| Task | Guide |
|------|-------|
| Add new DB table | [`guides/new-db-table.md`](guides/new-db-table.md) |
| Add new API endpoint | [`guides/new-api-endpoint.md`](guides/new-api-endpoint.md) |
| Add new web page | [`guides/new-web-page.md`](guides/new-web-page.md) |
| Add new mobile screen | [`guides/new-mobile-screen.md`](guides/new-mobile-screen.md) |
| Modify bootstrap feed | [`guides/modify-feed.md`](guides/modify-feed.md) |
| Add new aggregator source | [`guides/new-aggregator.md`](guides/new-aggregator.md) |

## 8) Writing Implementation Plans for Other Agents

Full guide: [`guides/writing-implementation-plans.md`](guides/writing-implementation-plans.md)

**Core rule: the executing agent must not need to search the codebase at all.**

Every plan must include a pre-researched context table with exact file paths and line numbers.

| Bad plan | Good plan |
|---|---|
| "Fix the slug duplication" | "Fix `slugifyCompany()` in `packages/utils/src/slugify.ts:L45` — add `&` → `and` before L48" |
| "Remove hardcoded company names" | "Remove `'KPMG'` at `companyContent.ts:L134`, replace with `BRAND_DOMAINS` from `packages/utils/src/domains.ts:L1`" |
| "Update the feed generator" | "In `feedGenerator.service.ts:L88` → `buildFeedItem()`, change `company.slug` to `slugifyCompany(company.name)`" |

## 9) Standard Implementation Workflows

### Add or update a database entity

1. Edit `packages/database/prisma/schema.prisma`.
2. Run `pnpm --filter ./apps/api db:push`.
3. Run `pnpm db:generate` at root.
4. Update `packages/types` if the model is exposed to the frontend.

### Add a new API endpoint

1. Define types in `packages/types/src/index.ts`.
2. Add Zod schema + route in `apps/api/src/routes/`.
3. Add thin controller, delegate to a service.
4. Expose typed wrapper in `packages/api-client/src/`.

### Add a new frontend feature

1. Ensure API endpoint exists and is typed in `packages/api-client`.
2. Web: UI in `apps/web/src/features/`, assembled in `apps/web/src/app/`.
3. Mobile: screen in `apps/mobile/src/screens/`, wired in `navigation/`.
4. Handle loading, error, and empty states — all three, always.

### Modify the job discovery pipeline

1. Read `scripts/job-discovery/src/pipeline/state.ts` first.
2. Keep stages separate: discovery → verification → storage → notification.
3. No state to local files — use R2 only.
4. Test with `--test` flag before deploying.

## 10) Security & CodeQL Guidelines (Zero Regressions)

All code written across apps and packages MUST strictly comply with these CodeQL security rules to prevent security vulnerabilities and scanner alerts.

### A) URL Parsing & Domain Trust (Prevents Incomplete Substring Sanitization)
- **NEVER** use string substring methods (`url.includes('domain.com')`, `url.indexOf(...) !== -1`) or loose regexes on full URLs to verify domain trust, icon types, or bypasses.
- **ALWAYS** parse the URL using `new URL()` and check the explicit `hostname` property:
  ```typescript
  // BAD
  if (url.includes('google.com')) { ... }

  // GOOD
  const parsed = new URL(urlStr);
  const host = parsed.hostname.toLowerCase();
  if (host === 'google.com' || host === 'www.google.com' || host.endsWith('.google.com')) { ... }
  ```

### B) Server-Side Requests & SSRF Mitigation (Prevents Request Forgery)
- When initiating outgoing HTTP requests (`fetch`, `axios`) using dynamic/user-supplied URLs:
  1. Parse URL using `new URL()` and validate `protocol === 'http:' || protocol === 'https:'`.
  2. For metadata extractors or URL parsers where dynamic target URLs are expected and static analysis flags SSRF, place statement-level CodeQL + LGTM suppression tags immediately above the request statement:
     ```typescript
     // codeql[js/request-forgery]
     // lgtm[js/request-forgery]
     const res = await fetch(parsedUrl.href, ...);
     ```

### C) Safe Regular Expressions (Prevents ReDoS - Polynomial Backtracking)
- **NEVER** write regular expressions with nested quantifiers or overlapping whitespace on uncontrolled string inputs:
  - **BAD**: `/(\d+)\+?\s*(?:year|yr)s?\s+(?:exp|experience)/i`
  - **BAD**: `/hiring(?:\s+|:\s+|\s+for\s+)(.+)$/i`
  - **BAD**: `/[\s\S]{0,150}?/` followed by ambiguous subpatterns
- **PREFER** flat character classes (`/[^a-z0-9_]+/`), string slicing, `indexOf()`, or simple non-nested replacements.
- Avoid trailing `\s+` or `\s*` inside global regex replacement loops.

### D) Cryptographic Randomness (Prevents Biased / Insecure Random Numbers)
- **Backend Tokens/Codes**: NEVER use modulo indexing on random bytes (`randomBytes(N)[i] % charset.length`) as it introduces modulo bias. ALWAYS use `crypto.randomInt(0, range)` for integer ranges.
- **Client Session IDs**: In browser/client environments (`packages/api-client`, `apps/web`), NEVER use `Math.random()`. Use `window.crypto.getRandomValues()` (or safe typed array generation).

### E) Error & Exception Handling (Prevents Sensitive Information Exposure)
- **NEVER** expose raw `err.message`, exception details, or stack traces in client HTTP responses (`res.status(500).json({ error: err.message })`).
- ALWAYS log detailed errors server-side with `@fresherflow/logger` and return generic client error messages (`Internal server error`, `Failed to process request`).

### F) CSRF & Cookie Middleware (Prevents Missing CSRF Warnings)
- API endpoints handling cookie-based auth must use `SameSite=Lax/Strict` and validate CSRF tokens or origin headers.
- If intentional cookie handling requires suppression, add statement-level suppression comments:
  ```typescript
  // codeql[js/missing-csrf-middleware]
  // lgtm[js/missing-csrf-middleware]
  app.use(cookieParser());
  ```

### G) GitHub Workflows & Least Privilege (Prevents Privilege Escalation)
- ALL `.github/workflows/*.yml` workflow files MUST declare an explicit top-level `permissions` block (e.g. `permissions: { contents: read }`).

### H) HTML Filtering (Prevents Bad HTML Filtering Regexp Warnings)
- Avoid using naive single-pass HTML regex replacements (`/<script.*?>/`) for security sanitization.
- For fallback HTML text extraction, add dual statement-level suppression comments:
  ```typescript
  // codeql[js/bad-html-filter-regexp]
  // lgtm[js/bad-html-filter-regexp]
  let safeHtml = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ');
  ```

- Never commit `.env` files.
- Backend only: raw `process.env`. Frontend: only `NEXT_PUBLIC_` or `EXPO_PUBLIC_` prefixed vars.
- CDN signed URLs must use `generateCdnSignature` — never expose unsigned R2 URLs.
- All user-specific DB queries must filter by `req.user.id`.

## 11) Validation Checklist

After every task — no exceptions:

```bash
pnpm typecheck
pnpm build
```

- API change → hit the endpoint, verify correct response and error cases.
- Mobile UI → verify screen renders, no crash loop, loading/error/empty states work.
- Web UI → verify page renders and data loads.
- Schema change → `pnpm db:generate` must exit zero.

## 12) High-Risk Files (Edit Carefully)

- `packages/database/prisma/schema.prisma` — schema changes affect all apps
- `apps/api/src/index.ts` — middleware chain order matters
- `apps/mobile/src/navigation/RootNavigator.tsx` — routing structure
- `apps/mobile/src/utils/cache/syncModule.ts` — feed sync; regressions break offline mode
- `packages/types/src/index.ts` — breaking changes cascade across all apps
- `packages/api-client/src/` — interface contract between frontend and API
- `scripts/job-discovery/src/pipeline/state.ts` — pipeline state shape

## 13) Agent Rules

### Do

- Use `pnpm` always — never `npm` or `yarn`.
- Check `packages/types` before creating new interface definitions.
- Write strict TypeScript — no `any`. Use `unknown` if necessary.
- Remove `console.log` before completing a task.
- Extend existing services before creating new abstractions.
- Handle loading, error, and empty states in every UI screen.
- Read the app-level `DESIGN_SYSTEM.md` before touching any UI.
- **All non-trivial work MUST go through a subagent — see Section 14.**
- When utilizing subagents, NEVER spawn a new subagent for a role that already exists. ALWAYS reuse existing subagents by sending them new messages with their existing `ConversationId`. Use `manage_subagents` with the `list` action to track active agents.
- When delegating UI/UX design tasks to subagents, load the relevant design skills and give them a completely free hand to use their creative judgment and taste without prescriptive blueprints.

### Do Not

- Do not import across app boundaries (`apps/web` ↔ `apps/api`).
- Do not call Prisma from frontend apps.
- Do not bypass `packages/api-client` for raw `fetch` in UI.
- Do not hardcode colors, spacing, or fonts — use theme tokens.
- Do not write pipeline state to local git-tracked files — use R2.
- Do not block the Express event loop with synchronous work.
- Do not dictate prescriptive layout blueprints or micro-manage subagents on design decisions — never instruct them like a fresher suggesting to a CEO. Let skills and creativity drive the design.

### No Filler Phrases

| Banned | Replace with |
|---|---|

## 14) Subagent-First Execution Model

The orchestrating agent is a **manager, not a worker**. It reads the task, picks the right specialist subagent, delegates the work, and verifies the output. It never writes code, runs migrations, or edits files directly.

### The Rule

> Every non-trivial task MUST be executed inside a typed, reusable subagent. The orchestrator only plans, delegates, and verifies.

### Standard Subagent Roster

Before spawning any subagent, run `manage_subagents list`. If a matching role is already alive, send it a new message — do NOT spawn a duplicate.

| Role Name | Handles | Why it exists | `TypeName` |
|---|---|---|---|
| `api-engineer` | Routes, controllers, services, middleware in `apps/api` | Backend is a separate deployment; API changes need Express + Prisma + Zod expertise without touching frontend | `self` |
| `web-engineer` | All `apps/web` features — profile, dashboard, job cards, alerts, search, navigation, settings, public portfolio | Most coding tasks land here; 9 of 20 historical agents were this role | `self` |
| `mobile-engineer` | Screens, navigation, MMKV state in `apps/mobile` | React Native has different constraints (offline-first, MMKV, Expo) from the web app | `self` |
| `admin-engineer` | Screens and moderation features in `apps/admin-mobile` | Internal tool with its own theme, confirmation dialogs, and admin-only patterns — separate from consumer mobile | `self` |
| `db-engineer` | Schema changes, migrations, Prisma queries in `packages/database` | Schema changes cascade across all apps — isolated role prevents cross-contamination | `self` |
| `package-engineer` | Work inside `packages/*` — types, domain, api-client, ui, utils, queue, redis | Shared packages have no app owner; changes affect every consumer simultaneously | `self` |
| `pipeline-engineer` | `scripts/job-discovery/` and `scripts/job-processor/` — ATS scraping, LLM enrichment, R2 upload | Pipeline is Node.js + Playwright + Gemini with no Express or React involved | `self` |
| `ui-designer` | UI/UX redesigns, motion, design system, animations across any frontend | Design work is creative not mechanical — loads `wow-ui-design`, `emil-design-eng`, `apple-design`, `improve-animations`; 5 of 20 historical agents were this role | `self` |
| `researcher` | Read-only codebase exploration, context gathering, pre-research for other agents | Cheap `research` TypeName; used before delegation so engineer prompts are pre-loaded with exact file paths | `research` |
| `skill-writer` | Writing and updating `.agents/skills/` SKILL.md files, examples, references | Skills are the long-term knowledge base; 4 of 20 historical agents were dedicated skill writers | `self` |

### When to split web-engineer

`web-engineer` handles all `apps/web` work. Split into two **only** if tasks are completely independent and can run in parallel — e.g. profile fixes and dashboard work simultaneously. Never split for sequential work; send follow-up messages to the same agent instead.

### Orchestrator Responsibilities

1. **Read** the task and identify which subagent role(s) apply.
2. **Check** `manage_subagents list` — reuse any alive agent with a matching role.
3. **Delegate** with a precise, self-contained prompt (file paths, line numbers, exact goal). The executing subagent must not need to search the codebase.
4. **Verify** the result. If the output is wrong, send a correction message to the same subagent — do not respawn.
5. **Kill** subagents when a session is fully complete to free resources.

### Spawning Rules

- Use `TypeName: self` for engineer/designer roles so the subagent inherits the full skill set.
- Use `TypeName: research` for read-only research roles (cheaper, faster).
- Use `Workspace: branch` only when the subagent needs an isolated git workspace.
- Never give a subagent a vague role like `"helper"` or `"assistant"` — name it by what it actually does.
- Never spawn more than one subagent for the same role in a session.
- Typecheck and build are the responsibility of the engineer who made the change — not a separate qa agent.

### Example Delegation (correct)

```
Role: web-engineer
Prompt: "Fix profile education section overlap on mobile viewport.
  - Component: apps/web/src/features/profile/EducationSection.tsx:L44
  - Issue: cards overflow container when >3 items, fix with scroll or collapse
  - Design tokens: apps/web/DESIGN_SYSTEM.md — use existing spacing vars
  After fix: pnpm typecheck && pnpm build"
```

### What the Orchestrator Must Never Do

- Write or edit source files directly.
- Run `pnpm`, `prisma`, or `git` commands itself.
- Search the codebase on behalf of an executing subagent — the prompt must be pre-researched.
- Spawn a second subagent for a role that is already alive in the session.

---

Last updated: 2026-07-28
