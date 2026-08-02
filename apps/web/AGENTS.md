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

| Path | Owns |
|---|---|
| `src/app/` | Routes, layouts, loading, error, metadata |
| `src/features/` | Domain UI and feature logic |
| `src/ui/` | Shared presentational components |
| `src/hooks/` | Client hooks over typed API calls |
| `src/lib/` | Server helpers, API wrappers, formatting, cache helpers |
| `src/app/(admin)/` | Admin web routes |

Do not call Prisma from this app. Do not import from `apps/api`. Use `packages/api-client`, local server helpers, and CDN helpers.

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
| Logos | `src/ui/CompanyLogo.tsx` and CDN helpers |
| Shared types | `packages/types` |
| Shared business rules | `packages/domain` |

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
| `src/proxy.ts` | Request proxying and route protection |
| `src/lib/api/server-client.ts` | Server API client and cache policy |
| `src/lib/api/cdnFeed.ts` | CDN bootstrap feed access |
| `src/lib/api/client.ts` | Client API exports |
| `src/features/opportunities/` | Feed, filters, cards, detail UI |
| `src/ui/CompanyLogo.tsx` | Logo rendering and fallback |

## Standard workflow

### Add a page

1. Add `src/app/<route>/page.tsx` as a Server Component
2. Fetch initial data on the server
3. Add metadata for public routes
4. Add `loading.tsx` when data can block rendering
5. Add `error.tsx` for isolated route failures
6. Use existing UI primitives and feature modules

### Add a client hook

1. Create `src/hooks/useName.ts`
2. Wrap a typed API client function
3. Return consistent `data`, `loading`, and `error` state
4. Keep retries and cache invalidation scoped

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
