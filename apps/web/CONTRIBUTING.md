# Contributing to FresherFlow Web (`apps/web`)

Welcome! We are thrilled that you want to contribute. The Web application has a specific architecture that might look a bit different from a standard Next.js project. 

To help you get started without any confusion, please read this quick guide on how our folders are structured and where your code should go.

---

## 🏗️ The Big Picture: Feature-Sliced Design

Instead of grouping all files by type (e.g., putting all components in one folder, all hooks in another), we use **Feature-Sliced Design (FSD)**. This means we organize our code by **business domain** (the "feature").

If you are working on the "Jobs" page, almost all the code you write will live in `src/features/jobs/`. 

### 1. `src/features/` (Where most of your work happens)
This folder contains self-contained modules for specific domains of the app (e.g., `jobs`, `auth`, `profile`, `admin`).
Each feature folder has its own mini-architecture:
- `components/`: UI specific to this feature (e.g., `JobCard.tsx`).
- `hooks/`: React hooks specific to this feature.
- `actions/`: Next.js Server Actions for this feature.
- `types/`: TypeScript interfaces for this feature.

**Rule of thumb:** If a component or function is only used by one specific part of the app, it belongs inside a `feature` folder, not in the global folders!

### 2. `src/app/` (Next.js Routing Only)
This contains the standard Next.js App Router files (`page.tsx`, `layout.tsx`, `error.tsx`). 
**Important:** We try to keep these files as "thin" as possible. They should mostly just import and render the complex components from `src/features/`. Do not write complex business logic directly in `page.tsx`!

### 3. `src/components/` (Global UI Only)
This folder is strictly for **reusable, generic UI components** that are used across *multiple* features.
- `ui/`: Standard UI elements like `Button.tsx`, `Input.tsx`.
- `layout/`: Global wrappers like headers, footers, and sidebars.

*Note: You might notice some UI components here instead of in our shared `packages/ui` workspace. While our long-term goal is to move generic UI to `packages/ui`, for now, you can use the ones in `src/components/ui/`.*

### 4. `src/lib/` (Utilities and API)
Contains global helper functions, configuration, and our custom API client.

---

## ⚠️ Current Quirks to be Aware Of

Every large codebase has a few quirks. Here is what you need to know about ours so you don't get stuck:

1. **The API Client:** 
   According to our monorepo rules, we are supposed to use the shared `packages/api-client`. However, `apps/web` currently has its own massive custom API client located at `src/lib/api/client.ts`. 
   **Action for you:** When fetching data in the web app, use the existing patterns and functions inside `src/lib/api/client.ts` rather than the shared package.

2. **Route Clutter:**
   The `src/app/` directory currently has a lot of root-level folders (`/about`, `/careers`, `/terms`, etc.). It can look a bit overwhelming. Just look for the specific URL path you need to edit.

3. **UI Alias:**
   You might see imports like `import { Button } from '@repo/ui'`. This is a custom alias in our `tsconfig.json` that points to the shared `packages/ui` folder.

---

## 📝 Quick Checklist for Contributors

- [ ] **Are you building a page?** Create the route in `src/app/`, but put the heavy logic/UI in `src/features/`.
- [ ] **Are you building a button/input?** Put it in `src/components/` (or `packages/ui`).
- [ ] **Are you fetching data?** Use `src/lib/api/client.ts` or create a Server Action in your feature folder.
- [ ] **Does it only apply to "Profiles"?** Put it in `src/features/profile/`.

Thank you for contributing to FresherFlow! If you are ever unsure where a file should go, just ask a maintainer.
