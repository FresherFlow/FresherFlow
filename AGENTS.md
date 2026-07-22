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
- API layer: Routes → Controllers → Services/Domain → Infrastructure (Prisma).
- Wrap multi-table DB writes in `prisma.$transaction([...])`.
- Heavy work (email, push, feed regen) → BullMQ worker. Never block Express event loop.
- Bootstrap feed: mobile syncs via `apps/mobile/src/utils/cache/syncModule.ts` — do not bypass.
- Feed regeneration is triggered from admin panel or publish events — never from the frontend.

### Single Source of Truth

| What | Where |
|---|---|
| Database schema | `packages/database/prisma/schema.prisma` |
| API types (request/response) | `packages/types/src/index.ts` |
| API client wrappers | `packages/api-client/src/` |
| Bootstrap feed | `cdn.fresherflow.in/bootstrap-feed.min.json` |
| Mobile state | `apps/mobile/src/store/` |
| Shared utilities | `packages/utils/src/` |

## 3) UI Design System Rules

Each app has its own `DESIGN_SYSTEM.md`. Read it before touching any UI.

- Web → [`apps/web/DESIGN_SYSTEM.md`](apps/web/DESIGN_SYSTEM.md)
- Mobile → [`apps/mobile/DESIGN_SYSTEM.md`](apps/mobile/DESIGN_SYSTEM.md)
- Admin Mobile → [`apps/admin-mobile/DESIGN_SYSTEM.md`](apps/admin-mobile/DESIGN_SYSTEM.md)

Before building a new component, check `packages/ui` — it may already exist.

## 4) Job Matching and Feed

- Core matching: `packages/domain` → `calculateOpportunityMatch(profile, opportunity)`
- Scoring runs **client-side on mobile** after feed download — never move this to the API.
- Feed URLs: `cdn.fresherflow.in/bootstrap-feed.min.json`, `cdn.fresherflow.in/government-feed.json`
- Version ticker: `cdn.fresherflow.in/feed-version.json`
- Mobile sync flow: version check → signed URL → fetch → score → MMKV cache

## 5) Permissions and Authentication

- JWT-based. Protected API routes use `requireAuth` middleware.
- Web: auth via cookies. Mobile: auth via SecureStore.
- RBAC roles: `student`, `recruiter`, `admin`.
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

## 10) Security

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

### Do Not

- Do not import across app boundaries (`apps/web` ↔ `apps/api`).
- Do not call Prisma from frontend apps.
- Do not bypass `packages/api-client` for raw `fetch` in UI.
- Do not hardcode colors, spacing, or fonts — use theme tokens.
- Do not write pipeline state to local git-tracked files — use R2.
- Do not block the Express event loop with synchronous work.

### No Filler Phrases

| Banned | Replace with |
|---|---|
| "I'm focusing intently on..." | Just do it |
| "Zeroing in on..." | Just do it |
| "Refining my approach..." | Just do it |
| "I'm now exploring..." | State what you found |
| "This is leading to more robust..." | Say what changed |
| "Prioritizing tool specificity..." | Use the right tool |

**Rule:** Action > narration. State what you're doing, then do it.

---

Last updated: 2026-07-22
