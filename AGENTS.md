# FresherFlow - AI Agent Guide

This file is for AI coding agents only.
Use it as the primary implementation playbook for building new features and updating existing ones in this monorepo.

## 1) Project Snapshot

- App type: Job & Walk-in Opportunity Platform
- Language: TypeScript (Strict mode preferred)
- Frontends: Next.js 16 App Router (Web), React Native with Expo (Mobile/Admin)
- Backend: Node.js, Express, BullMQ
- Database: PostgreSQL (via Prisma ORM), Redis (Cache & Queues)
- Architecture: Decoupled Monorepo with Domain-Driven Design (DDD) elements in backend
- Package Manager: `pnpm` + Turborepo

## 2) Core Architecture (Do Not Bypass)

### Workspace Layers

- **Apps Layer** (`apps/`): Deployable entry points.
  - Web: Next.js UI using `apps/web/src/app` (App Router).
  - Mobile: React Native UI using `apps/mobile/src/screens` and `apps/mobile/src/navigation`.
  - API: Express controllers and routes in `apps/api/src/routes`.
  - Worker: BullMQ processors in `apps/worker` and `apps/api/src/worker.ts`.
- **Packages Layer** (`packages/`): Shared, reusable logic and UI.
  - UI Components: `packages/ui`
  - Database client & Schema: `packages/database`
  - API Client wrappers: `packages/api-client`
  - Types: `packages/types`

### Single Source of Truth

- **Database**: The sole definition of database tables is `packages/database/prisma/schema.prisma`.
- **API Contracts**: Shared types defining requests/responses must live in `packages/types`.
- **UI State (Mobile)**: Contexts and global state in `apps/mobile/src/store` and `apps/mobile/src/contexts`.
- **UI State (Web)**: React Contexts in `apps/web/src/contexts` and Server Components in `apps/web/src/app`.

### State and Data Flow Conventions

- Do not perform direct database queries (Prisma calls) inside the frontend apps (`apps/web`, `apps/mobile`).
- Web and Mobile must always fetch data using the typed functions exported from `packages/api-client`.
- Backend architecture follows a tiered structure: Routes -> Controllers -> Services/Domain. 
- Use immutable data patterns and pure functions when parsing job data in `packages/parser`.

## 3) Repository and Data Patterns

### Backend Repositories & Domain

- Data access logic is kept in `apps/api/src/infrastructure` or domain-specific repositories.
- Core business rules (e.g. eligibility matching) exist in `packages/domain` or `apps/api/src/domain`.
- Always wrap database writes in transactions when modifying related entities.

### Frontend Data Management

- Web API fetching: Next.js Server Components for initial load, custom hooks wrapping `api-client` for client-side mutations (`apps/web/src/hooks`).
- Mobile API fetching: React Query or custom hooks leveraging `packages/api-client`.
- Local Mobile Storage: Use MMKV via `packages/react-native-mmkv` for high-performance synchronous key-value storage.

### Caching and Queues

- Heavy computations (parsing incoming jobs, mass emails) must go to BullMQ.
- Queue definitions live in `packages/queue`.
- Cache frequent API reads (e.g., job lists) using Redis (via `packages/redis`).

## 4) Key Feature Areas and Main Files

### Web App (`apps/web/src/`)

- App Router entry: `app/layout.tsx`, `app/page.tsx`
- Reusable page features: `features/`
- Shared components: `components/`
- Instrumentation/Proxy: `instrumentation.ts`, `proxy.ts`

### Mobile App (`apps/mobile/src/`)

- Main screens: `screens/`
- Navigation stacks: `navigation/`
- UI Themes and styling: `theme/`
- Persistent State: `store/`

### API Backend (`apps/api/src/`)

- Express root setup: `index.ts`
- Routes definitions: `routes/`
- Custom Middlewares (Auth, Error handling): `middleware/`
- Background CRON jobs: `cron/`
- Core libs: `lib/`

### Core Packages (`packages/`)

- Prisma Schema: `database/prisma/schema.prisma`
- Shared Types: `types/src/index.ts`
- Shared UI: `ui/src/`
- Auth configurations: `auth/`
- NLP Parser: `parser/`

## 5) UI Design System Rules

### Tokens and Colors

- Use Tailwind CSS for Web (`apps/web/tailwind.config.js`).
- Use the established theme tokens in `apps/mobile/src/theme/` for React Native.
- Avoid hardcoding hex colors or pixel values in UI components. Reference theme constants.

### Shared Components First

- Before building a new button, card, or input field, check `packages/ui` to see if it already exists.
- If building a component that will be used by both Web and potentially Admin Web, put it in `packages/ui`.
- If building a purely React Native component, check `apps/mobile/src/components`.

## 6) API and Parsing Behavior

### API Rules

- All endpoints must validate incoming payload schemas (using Zod or Joi schemas located in `packages/schemas` or `apps/api/src/middleware`).
- Keep controllers thin; delegate complex logic to services.
- Paginate array responses by default (limit/offset or cursor).

### Parsing Pipeline

- The `packages/parser` extracts structured data (salary, experience, role) from unstructured job descriptions.
- NLP patterns must be heavily unit-tested.
- Treat parsed data as unverified until a human moderator approves it via `apps/admin-mobile`.

## 7) Permissions and Authentication

- Authentication is managed via JWTs.
- Protected routes in the API must use the `requireAuth` middleware.
- Web app handles auth state via Context/Cookies. Mobile app handles it via Context/SecureStore.
- Role-based Access Control (RBAC): Differentiate between `student`, `recruiter`, and `admin` roles when allowing mutations.

## 8) Navigation and Entry Points

- Web entry: `apps/web/src/app/page.tsx`
- Mobile entry: `apps/mobile/App.tsx` or `apps/mobile/src/navigation/RootNavigator.tsx`
- API entry: `apps/api/src/index.ts`
- Worker entry: `apps/api/src/worker.ts` or `apps/worker/src/index.ts`

## 9) Naming and Organization Conventions

- Data classes/Interfaces: `IUser`, `JobResponse`, `CreateJobPayload` (in `packages/types`)
- React Components: PascalCase (`JobCard.tsx`)
- Hooks: camelCase (`useAuth.ts`)
- API Controllers: `*Controller.ts`
- Folders: kebab-case or camelCase depending on the workspace. Stick to existing conventions per app.
- Next.js Routes: App Router standard (`page.tsx`, `layout.tsx`, `route.ts`).

## 10) Feature-Specific Implementation Guides

For the task types below, adhere to these strict flows:

| Task | Workflow |
|------|-----------|
| Add new DB table | 1. Update `schema.prisma`. 2. Run `pnpm db:push`. 3. Run `pnpm db:generate`. 4. Export types. |
| Add new API Endpoint | 1. Add schema/type. 2. Add route in `apps/api`. 3. Add controller. 4. Expose in `packages/api-client`. |
| Add new Web Page | 1. Create folder in `apps/web/src/app`. 2. Add `page.tsx`. 3. Fetch data via API client or Server Component. |
| Add new Mobile Screen | 1. Add component in `apps/mobile/src/screens`. 2. Wire in `navigation/`. 3. Add to typings. |

## 11) Standard Implementation Workflows

### Add or update a database entity

1. Open `packages/database/prisma/schema.prisma`.
2. Define the new model and its relations.
3. If running locally, apply changes using `pnpm --filter ./apps/api db:push`.
4. Run `pnpm db:generate` at the root to update Prisma Client across all packages.
5. Update `packages/types` to reflect the new model interfaces if they are exposed to the frontend.

### Create a new frontend feature

1. Ensure the necessary API endpoint exists and is typed in `packages/api-client`.
2. For Web: Create UI in `apps/web/src/features/` and assemble in `apps/web/src/app/`.
3. For Mobile: Create UI in `apps/mobile/src/screens/` and wire navigation.
4. Utilize components from `packages/ui`.
5. Connect state and handle loading/error states gracefully.

## 12) Performance Guardrails

- Do not import heavy Node.js standard libraries (like `fs`, `crypto`) into the Web or Mobile frontends.
- Keep the `api` app responsive. Offload email sending, push notifications, and data scraping to the `worker` app.
- Ensure Next.js Server Components are correctly optimized and not accidentally marked as `"use client"` unless necessary.

## 13) Security and Privacy Constraints

- Never commit `.env` files.
- Sensitive values must be accessed via `process.env` only on the backend (`api`, `worker`).
- Frontend apps must only access environment variables explicitly prefixed with `NEXT_PUBLIC_` or `EXPO_PUBLIC_`.
- All database queries involving user-specific data must implicitly filter by the authenticated user's ID.

## 14) Testing and Validation Checklist (Minimum)

- Build compiles successfully via `pnpm build`.
- TypeScript checks pass via `pnpm typecheck`.
- If modifying the API, run backend tests if available.
- Start the affected apps locally via `pnpm dev` and verify that the UI renders without crash loops.
- Verify that terminal logs show no Prisma or Express unhandled promise rejections.

## 15) High-Risk Files (Edit Carefully)

- `packages/database/prisma/schema.prisma` (Database schema changes)
- `apps/api/src/index.ts` (API middleware chain)
- `apps/mobile/src/navigation/RootNavigator.tsx` (Mobile app routing structure)
- `package.json` and `turbo.json` at the root (Build pipelines)

When touching these files, keep changes minimal, localized, and regression-aware.

## 16) Agent Do/Do Not

### Do

- Always use `pnpm` with `--filter` for package installation.
- Use exact versions for React Native dependencies to avoid Expo conflicts.
- Always check `packages/types` before creating duplicate interface definitions.
- Write strict TypeScript code without using `any`. Use `unknown` if necessary.
- Remove `console.log` statements before completing a task.

### Do Not

- Do not use `npm` or `yarn`. Always use `pnpm`.
- Do not import `apps/web` files into `apps/api` (or vice versa). Keep the workspace boundary clean.
- Do not perform expensive synchronous operations on the main Express event loop.
- Do not bypass the `packages/api-client` to make raw `fetch` requests in the UI.

## 17) Useful File Index

- `packages/database/prisma/schema.prisma`
- `apps/api/src/index.ts`
- `apps/api/src/routes/`
- `apps/web/src/app/page.tsx`
- `apps/mobile/src/navigation/`
- `packages/types/src/index.ts`
- `packages/api-client/src/`

---

Last updated: 2026-05-27
