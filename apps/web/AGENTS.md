# FresherFlow web agent guide

This file is for AI coding agents working in `apps/web`. Read the root `AGENTS.md` first.

## App profile

| Concern | Value |
|---|---|
| Framework | Next.js App Router |
| Language | TypeScript, strict mode |
| Styling | Tailwind CSS with CSS variable tokens |
| Auth | Firebase web auth and JWT cookies |
| Data | API client, Server Components, CDN bootstrap feed |
| Hosting | Vercel |

Read `DESIGN_SYSTEM.md` before UI changes.

## Architecture

### One home per file type — feature-first (Cal.com pattern)

Organize by **business feature first**, not by file type. This mirrors `cal.com/packages/features` where each feature is a vertical slice owning its own components, hooks, lib, and types.

A file's location is decided by **who owns it**, not what type it is. Ask: "Who owns this?" before creating a file. Pick the first row that matches.

| If the file… | it lives in | It must never live in |
|---|---|---|
| defines a route, layout, loading, error, not-found, or metadata | `src/app/<route>/` | — |
| is a server action owned by one route | `src/app/<route>/actions.ts` | `src/lib/`, `src/features/` |
| is used by exactly **one** route and nothing else | `src/app/<route>/_components/` · `src/app/<route>/_hooks/` | `src/ui/`, `src/lib/`, `src/features/` |
| is product UI, a feature hook, or feature logic | `src/features/<domain>/` | `src/ui/`, `src/lib/`, `src/hooks/` |
| is mounted once at the app root (error boundary, toaster, theme script, page transition) | `src/features/shell/` | `src/lib/` |
| is a generic UI primitive with **no product knowledge** | `src/ui/` | `src/features/` |
| is a framework-agnostic reusable hook | `src/hooks/` | `src/features/`, `src/lib/` |
| is infrastructure or I/O (API wrapper, server helper, auth, cache, config, SEO) | `src/lib/` | `src/features/`, `src/ui/` |
| is an app-level React provider/context | `src/lib/providers/` | `src/lib/auth/`, `src/features/`, `src/ui/` |
| reads or writes browser persistence (localStorage / sessionStorage) | `src/lib/storage/` | anywhere else |
| is a server-only helper (DB pool, rate limit) | `src/lib/server/` | `src/features/`, `src/ui/` |

**The product-knowledge test** for `src/ui/` and `src/lib/`: the file must still make sense in a
different product. If it mentions jobs, opportunities, walk-ins, freshers, referrals, profiles,
dashboards, contributors, or navigation, it is product code and belongs in `src/features/`.

**The ownership test** (eliminates folder proliferation):

- Route → `app/`
- Job functionality → `features/opportunities/` (jobs, walk-ins, internships are one feature: opportunities)
- Room functionality → `features/community/` 
- Profile functionality → `features/profile/`
- Generic UI → `ui/`
- Generic browser hook → `hooks/`
- Database/auth/API infrastructure → `lib/`

If answer is "shared by everything" → shared code. If "used by jobs" → `features/opportunities/`. If "used by one component only" → beside that component.

**When to split inside a feature** (Cal.com lesson — don't create folders for file types prematurely):

```text
# Small feature (<5 files or <300 LOC per concern) — keep flat
features/companies/
├── CompanyLogo.tsx
├── CompaniesDirectoryClient.tsx
├── companyContent.ts
├── companySlugger.ts
├── hooks.ts
└── index.ts

# Large feature (like opportunities, 95 files) — split is justified
features/opportunities/
├── components/   # UI
├── hooks/        # feature hooks
├── api/          # data fetching
├── domain/       # business rules (eligibility, taxonomy, matchScore)
├── utils/        # feature-specific helpers
├── types.ts
└── index.ts
```

Do not create `components/`, `hooks/`, `utils/`, `lib/`, `api/`, `domain/`, `parser/`, `seo/` folders for a small feature just because the file type exists. Split only when files actually become large. Current `features/opportunities` had 8 subfolders (`api, components, domain, hooks, lib, parser, seo, utils`) — retain only `components, hooks, api, domain, utils`.

**What `lib` means** — infrastructure only, like `cal.com/packages/lib`:

```text
lib/
├── api/        # API wrappers
├── auth/       # auth infra
├── cache/      # cache infra
├── config/     # config
├── server/     # server-only helpers
└── storage/    # browser persistence
```

Never `lib/formatJobFeedTitle.ts`, `lib/driveTimeline.ts`, `lib/walkinMapUtils.ts` — those belong in their feature.

**What `hooks` means** — genuinely generic only:

```text
hooks/
├── useDebounce.ts
├── useMediaQuery.ts
├── useClickOutside.ts
└── useResizeObserver.ts
```

`useOpportunityDetail`, `useSavedJobs`, `useProfileForm`, `useAdminOpportunities` belong beside their feature, not in global hooks.

**Cal.com reference** (`scratch/repos/cal.com/packages/features`): each feature owns `components/`, `lib/`, `services/`, `repositories/`, `hooks/`, `di/` — vertical slice, not horizontal layering. `packages/ui` and `packages/lib` are only truly shared code. FresherFlow mirrors this: `src/features/<domain>/` vertical slices, `src/ui/` and `src/lib/` shared only.

### Import direction — enforced by eslint

```text
app/  →  features/  →  ui/ , hooks/ , lib/
```

- `app/` may import anything.
- `features/` may import `ui/`, `hooks/`, `lib/`.
- `ui/` and `hooks/` may import only themselves and `lib/utils`.
- `lib/` may **not** import `features/` — that is a back-edge. Move the shared piece down
  (into `lib/cache`, `lib/utils`, …) or inject it from `app/`.
- A route-private `app/<route>/components|hooks` file must not be imported from outside that
  route. If two places need it, it belongs in `src/features/`.

### Route groups

| Path | Owns |
|---|---|
| `src/app/(admin)/` | Admin web routes |
| `src/app/(auth)/` | Login, signup, logout, onboarding (choose-username) |
| `src/app/(user)/` | Authenticated user pages (dashboard, profile, settings) |
| `src/app/(public)/` | Public SEO pages (jobs, companies, batch, deadlines) |

### Naming

| Kind | Convention | Example |
|---|---|---|
| React component | `PascalCase.tsx` | `OpportunityCard.tsx` |
| Hook | `useThing.ts` | `useSavedJobs.ts` |
| Module, util, config | `kebab-case.ts` or `camelCase.ts` — match the folder | `listUtils.ts`, `nav-config.ts` |
| Folder | `kebab-case` | `saved-searches` |

One concept has one name. `AppSidebar.tsx` and `app-sidebar.tsx` in the same repo is a bug.
`utils.ts` / `helpers.ts` / `common.ts` are banned unless the file genuinely owns one narrow
responsibility that nothing else can name better.

### A move is not complete until the old path is gone

This is the rule that keeps the tree clean. When a file moves:

1. `git mv` it.
2. Rewrite **every** importer to the new path.
3. Delete the old path — **in the same commit**.

### Migration shims are temporary by construction

A shim is a file whose only body is `export … from '<new path>'`.

1. It must carry a first-line comment giving the canonical path, why it still exists, and the
   condition that deletes it.
2. It may live for at most **one** merged PR. It is not a compatibility layer.
3. It must not be the only public entry for a module. Barrels are permanent APIs and must be
   named as such (`src/ui/cn.ts`, `src/lib/api/rateLimit.ts`).
4. It must not sit in `src/ui/` re-exporting `src/features/` — that inverts the layering.
5. A shim left in place after the PR that created it is dead code. Delete it.

Check the tree with `pnpm --filter ./apps/web check:structure` — **dead shims must stay at 0**.

### Boundaries this app must respect

Do not call Prisma from this app. Do not import from `apps/api`. Use `packages/api-client`,
local server helpers, and CDN helpers. Do not mix Firebase-specific hooks with generic
utilities.


## Server and client component rules

Default route files are Server Components.

- Fetch initial public data in Server Components
- Keep `"use client"` at leaf components for interactivity
- Pass serializable props from server to client
- Put browser APIs, stateful hooks, effects, and event handlers in Client Components
- Keep mutations in server actions or typed client hooks, following existing patterns
- Do not move a whole page to a Client Component to fix one interactive widget

Use `server-only` boundaries for helpers that read cookies, headers, or server env vars.

## Data and API rules

| Need | Use |
|---|---|
| Server-side API calls | `src/lib/api/server-client.ts` |
| Client-side API calls | hooks in `src/hooks/` or wrappers in `src/lib/api/` |
| Opportunity feed | `src/lib/api/cdnFeed.ts` |
| Logos | `src/features/companies/components/CompanyLogo.tsx` and CDN helpers |
| Shared types | `packages/types` |
| Shared business rules | Root [`AGENTS.md`](../../AGENTS.md) |

Never add raw `fetch` calls in UI components when an API client wrapper exists.

## ISR and cache safety

Treat cache behavior as production behavior.

- Public feed and category routes may use bounded `revalidate`
- User-specific routes use `no-store`: dashboard, profile, saved jobs, alerts, settings, admin
- CDN feed fetches must not use `no-store` in production paths
- High-cardinality routes must avoid broad tag invalidation
- Per-user mutations must not invalidate global feed tags
- Prefer narrow tags that match the entity or route scope
- Confirm pages using cookies or auth are never statically cached
- Keep `generateStaticParams` bounded and intentional

If a route can expose private data, it must be dynamic and uncached.

## High-cardinality route policy

Opportunity detail pages, company pages, and slug routes can grow without bound.

- Do not revalidate every slug after a single publish
- Do not attach broad tags such as `feed` to every detail page unless invalidation is scoped
- Use CDN feed helpers for public data instead of live `no-store` API calls
- Keep metadata generation cheap and cacheable for public pages
- Avoid fetching full feeds inside every slug request

## Vercel cost guardrails

- Prefer static or ISR public pages over per-request rendering
- Avoid `no-store` on high-traffic public pages
- Avoid broad `revalidatePath("/")` or root layout invalidation
- Keep image usage on `next/image`
- Do not put large JSON payloads into page props
- Do not fetch the bootstrap feed repeatedly from Client Components
- Keep middleware and proxy logic minimal, deterministic, and fast

## SEO and public route guardrails

Public pages need stable metadata and crawl-safe content.

- Export `metadata` or `generateMetadata` for public routes
- Use canonical URLs for slug pages when existing helpers support it
- Do not index authenticated, admin, preview, or error routes
- Keep public page content independent of the current user
- Do not expose internal IDs, admin counts, raw scrape payloads, or unpublished opportunities
- Ensure Open Graph images and logos use approved CDN helpers

## Environment variables

| Variable | Scope | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Client | Public API base URL |
| `API_URL` | Server | Server-side API base URL |
| `NEXT_PUBLIC_ADMIN_API_URL` | Client | Optional admin API override |
| `NEXT_PUBLIC_USE_SEPARATE_ADMIN_API` | Client | Optional admin routing flag |

Client code may read only `NEXT_PUBLIC_*`. Server code may read server-only env vars. Never commit `.env` files.

## Key files

| File | Purpose |
|---|---|
| `src/app/layout.tsx` | Root layout, providers, metadata defaults |
| `src/app/globals.css` | Design tokens and global CSS |
| `src/app/(auth)/components/AuthHeader.tsx` | Auth page header |
| `src/features/navigation/` | Sidebar, top nav, megamenu, and mobile navigation |
| `src/app/(user)/layout.tsx` | User account layout (wraps with NavigationWrapper) |
| `src/proxy.ts` | Request proxying and route protection |
| `src/features/auth/components/ProfileGate.tsx` | AuthGate and UsernameGate components |
| `src/lib/auth/AuthContext.tsx` | Auth provider, session management, Firebase sync |
| `src/lib/api/server-client.ts` | Server API client and cache policy |
| `src/lib/api/cdnFeed.ts` | CDN bootstrap feed access |
| `src/lib/api/client.ts` | Client API exports |
| `src/features/opportunities/` | Feed, filters, cards, detail UI |
| `src/features/dashboard/hooks/` | Dashboard-specific Firebase hooks |
| `src/features/companies/components/CompanyLogo.tsx` | Logo rendering and fallback |

## Standard workflow

### Add a page

1. Add `src/app/<route>/page.tsx` as a Server Component
2. Fetch initial data on the server
3. Add metadata for public routes
4. Add `loading.tsx` when data can block rendering
5. Add `error.tsx` for isolated route failures
6. Use existing UI primitives and feature modules

### Add a client hook

1. **Generic utility** → `src/hooks/useName.ts` (framework-agnostic, reusable)
2. **Feature-specific** → `src/features/<domain>/hooks/useName.ts` (uses Firebase, domain types)
3. Wrap a typed API client function
4. Return consistent `data`, `loading`, and `error` state
5. Keep retries and cache invalidation scoped

## Auth gates

| Component | Purpose | Use when |
|---|---|---|
| `AuthGate` | Redirects to `/login` if not authenticated | Any route requiring login |
| `UsernameGate` | Redirects to `/login` or `/choose-username` | Routes needing completed profile |

Import from `@/features/auth/components/ProfileGate`.
Do NOT use `ProfileGate` (deprecated alias for `UsernameGate`).
Do NOT nest gate components — use one gate per page.

## Security rules

- Parse URLs with `new URL()` before hostname checks
- Do not use `Math.random()` for tokens, IDs, or tracking keys
- Do not return raw server errors to clients
- Keep admin and authenticated routes protected by existing guards
- Do not expose server-only env vars through props or bundled modules
- Validate external image and logo URLs through existing helpers

## Validation

For web changes, run:

```bash
pnpm --filter ./apps/web typecheck
pnpm --filter ./apps/web build
```

Also verify:

- Public route renders without auth cookies
- Authenticated route does not cache private data
- Loading, error, and empty states render where data is fetched
- Feed pages use CDN helpers and bounded cache settings
- SEO metadata does not expose unpublished or admin-only data

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
