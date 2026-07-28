# FresherFlow Web — AI Agent Guide

This file is for AI coding agents only.
Use it as the implementation playbook for building and modifying the web app (`apps/web`).

For monorepo-wide rules, architecture, and shared patterns, read the root [`AGENTS.md`](../../AGENTS.md) first.

---

## 1) App Snapshot

- Framework: Next.js 16 App Router
- Language: TypeScript (strict)
- Styling: Tailwind CSS with CSS variable token layer
- Font: Inter (via `next/font/google`)
- Auth: Firebase (web) + JWT cookies
- Data: CDN bootstrap feed (R2) + API (`packages/api-client`) + Next.js Server Components
- Deploy: Vercel

## 2) Architecture (Do Not Bypass)

### Layers

- **App Router** (`src/app/`): Page routes, layouts, API routes
- **Features** (`src/features/`): Self-contained feature modules (UI + logic per domain)
- **UI** (`src/ui/`): Generic, reusable presentational components
- **Lib** (`src/lib/`): Utilities, helpers, server-only logic
- **Hooks** (`src/hooks/`): Client-side hooks wrapping `api-client`

### Data fetching rules

- Server Components fetch data directly via `packages/api-client` or CDN URLs — no client-side fetch on initial load.
- Client Components use custom hooks from `src/hooks/` for mutations and reactive data.
- Never call Prisma from the web app. All data goes through the API.
- CDN feed (`cdn.fresherflow.in/bootstrap-feed.min.json`) is fetched server-side via ISR — do not fetch it client-side.
- Server state is the source of truth — prefer `revalidatePath`/`revalidateTag` over client-side cache invalidation.

## 3) Initialization & Configuration Map

**Read this before searching the codebase.**

| What | File | Notes |
|---|---|---|
| API client (client-side) | `src/lib/api/client.ts` | Re-exports `_core.ts`, `auth.ts`, `profile.ts`, `opportunities.ts`, `social.ts` |
| API client (server-side SSR) | `src/lib/api/server-client.ts` | `serverApiClient()` — used in Server Components. Forwards cookies + sets `revalidate: 1800` for public routes |
| API base URL resolution | `packages/api-client/src/config.ts` | Reads `NEXT_PUBLIC_API_URL` → falls back to `window.location.origin` → `localhost:5000` |
| `configureClient()` | `packages/api-client/src/apiClient.ts:156` | Sets the global `ApiClient` instance. Auto-called on first use |
| Auth token key | `packages/api-client/src/apiClient.ts:71` | `ff_auth_token_v1` |
| Anon user ID key | `packages/api-client/src/apiClient.ts:72` | `ff_anon_user_id` |
| CSRF bypass header | `packages/api-client/src/apiClient.ts:67` | `X-Requested-From: fresherflow-client` — required on every request |
| Server caching rules | `src/lib/api/server-client.ts:27` | `/api/auth`, `/api/admin`, `/api/profile` etc. always `no-store` |
| Root layout | `src/app/layout.tsx` | Font loading, global providers, metadata defaults |
| CSS variable tokens | `src/app/globals.css` | All `--background`, `--foreground`, `--primary` etc. |
| Observability (Sentry) | `src/lib/observability.ts` | Initialized in `instrumentation.ts` |

### Environment Variables

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | API base URL for client-side calls |
| `API_URL` | Yes | API base URL for SSR calls |
| `NEXT_PUBLIC_ADMIN_API_URL` | No | Override admin API base |
| `NEXT_PUBLIC_USE_SEPARATE_ADMIN_API` | No | `"true"` to route `/api/admin` to separate base |

## 4) Key Routes & Files

| Route | File | Notes |
|---|---|---|
| `/` | `src/app/page.tsx` | Homepage |
| `/jobs` | `src/app/jobs/` | Job listings |
| `/internships` | `src/app/internships/` | Internship listings |
| `/walk-ins` | `src/app/walk-ins/` | Walk-in listings |
| `/government-jobs` | `src/app/government-jobs/` | Govt job listings |
| `/[slug]` | `src/app/[slug]/` | Individual opportunity page |
| `/dashboard` | `src/app/dashboard/` | User dashboard |
| `/profile` | `src/app/profile/` | User profile |
| `/(admin)` | `src/app/(admin)/` | Admin-only web routes |

## 5) Key Components & Utilities

**Check these before building anything new.**

| Component / Utility | File | Use |
|---|---|---|
| `JobCard` | `src/features/opportunities/components/JobCard.tsx` | Main job listing card — use as-is, don't rebuild |
| `OpportunityDetailPane` | `src/features/opportunities/components/OpportunityDetailPane.tsx` | Side-pane detail view |
| `OpportunityDetailClient` | `src/app/[slug]/OpportunityDetailClient.tsx` | Full detail page client component |
| `DetailHeroSection` | `src/app/[slug]/components/DetailHeroSection.tsx` | Detail page hero |
| `CategoryPageView` | `src/features/opportunities/components/CategoryPageView.tsx` | Full feed page with filters |
| `CompanyLogo` | `src/ui/CompanyLogo.tsx` | Logo with CDN fallback — always use for logos |
| `Skeleton` | `src/ui/Skeleton.tsx` | Loading skeletons |
| `EmptyState` | `src/ui/EmptyState.tsx` | Empty state |
| `ErrorMessage` | `src/ui/ErrorMessage.tsx` | Error display with retry |
| `Badge` | `src/ui/Badge.tsx` | Tag/status pills |
| `Button` | `src/ui/Button.tsx` | All button variants |
| `cn()` | `src/ui/cn.ts` | Tailwind class merging — always use for conditional classes |
| `slugify()` | `packages/utils/src/slugify.ts` | Import from `@fresherflow/utils` |
| `formatDate`, `formatSalary` | `src/lib/utils/format.ts` | Date and salary formatting |
| CDN feed client | `src/lib/api/cdnFeed.ts` | Bootstrap + government feed fetching |

### API data functions (`src/lib/api/`)

| File | What it wraps |
|---|---|
| `_core.ts` | Core opportunity fetching, filtering, pagination |
| `opportunities.ts` | Save, apply, get by slug |
| `social.ts` | Follow, referrals |
| `cdnFeed.ts` | Bootstrap feed, version check |
| `server-client.ts` | `serverApiClient()` — Server Components only |
| `admin.ts` | Admin-only calls |

### Feature Modules (`src/features/`)

| Module | Contains |
|---|---|
| `opportunities/` | Feed, filters, job cards, detail, hub pages |
| `companies/` | Company pages |
| `dashboard/` | Dashboard widgets |
| `profile/` | Profile view and edit |
| `auth/` | Login/register UI |

## 6) Standard Workflows

### Add a new page

1. Create folder under `src/app/<route-name>/`.
2. Add `page.tsx` as a Server Component — fetch data directly, no `"use client"`.
3. Export `metadata` with `title` and `description`.
4. Add `loading.tsx` skeleton if fetch takes time.
5. Add `error.tsx` if isolated error handling is needed.

### Add a new feature module

1. Create `src/features/<feature-name>/`.
2. All related UI, hooks, helpers stay inside that folder.
3. Wire into the relevant page in `src/app/`.

### Add a new client-side hook

1. Create `src/hooks/use<Name>.ts`.
2. Wrap a typed function from `packages/api-client` — never raw fetch.
3. Return `{ data, loading, error }` consistently.

## 7) Performance Guardrails

- No `"use client"` on data-fetching pages — Server Components fetch by default.
- Keep `"use client"` as leaf nodes — push data-fetching up.
- Use `generateStaticParams` for opportunity detail pages.
- Use `next/image` for all images — never `<img>`.
- CDN feed must use ISR (`revalidate`) — never `no-store` on the feed route.

## 8) High-Risk Files

- `src/app/layout.tsx` — changes affect every page
- `src/app/globals.css` — CSS variable changes affect all colors
- `src/proxy.ts` — misconfiguration breaks all data fetching

## 9) Web Security & CodeQL Guidelines

- **Client Randomness**: NEVER use `Math.random()` for anonymous session IDs or tracking tokens in API helpers or components. ALWAYS use `window.crypto.getRandomValues()` or safe typed array generation.
- **URL Domain Sanitization**: In admin forms or resource components, NEVER use raw `.includes('domain.com')` to classify or sanitize input URLs. ALWAYS parse via `new URL(url).hostname`.
- **Sensitive Data & Exposure**: Server Actions and API routes must never return raw error stack traces to the client. Log errors on the server and return sanitized error messages.

## 10) Free-Hand Creative UI/UX Delegation

- **No Prescriptive Blueprints**: When delegating web design, layout redesigns, or animation tasks to subagents, **never** hand down restrictive design blueprints, layout schemas, or micro-managed instruction checklists. Do not instruct subagents like a fresher suggesting to a CEO.
- **Trust the Skills**: Instruct the subagent to load the appropriate design and animation skills (`wow-ui-design`, `emil-design-eng`, `apple-design`, `improve-animations`, `find-animation-opportunities`), point them to the exact file or target route, and allow them 100% **free-hand creative freedom** to apply their taste and engineering excellence.

## 11) Subagents for This App

Agents that work in `apps/web`. Run `manage_subagents list` before spawning — reuse if already alive.

| Role | TypeName | What they do here |
|---|---|---|
| `web-engineer` | `self` | All feature work in this folder — profile, dashboard, job cards, alerts, search, navigation, settings, public portfolio. Split into two only when tasks are fully parallel. |
| `ui-designer` | `self` | Redesigns, motion, animations, design system polish for web pages. Loads `wow-ui-design`, `emil-design-eng`, `apple-design` — free hand, no prescriptive instructions. |

### Delegation example

```
Role: web-engineer
Prompt: "Add a 'saved jobs' empty state to the dashboard.
  - Component: apps/web/src/features/dashboard/SavedJobs.tsx:L88
  - Use EmptyState from src/ui/EmptyState.tsx — icon, title, description props
  - After: pnpm typecheck && pnpm build"
```
