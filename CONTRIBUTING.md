# Contributing to FresherFlow

Thank you for your interest in contributing to FresherFlow! We are building a high-performance, verified job and walk-in discovery portal for students and freshers. 

Before you start writing code, please read this guide to understand our technical philosophy, workspace structure, and development guidelines.

---

## 🧠 Technical Philosophy (Anti-Overengineering)

To keep the platform fast, lightweight, and maintainable, we enforce a strict anti-overengineering policy (see our full [Development Rules](./docs/rules.md)):

1. **YAGNI (You Aren't Gonna Need It)**: Do not build features or abstract layers that are not required for the immediate task.
2. **Minimalist Stack**: Prefer PostgreSQL for search, filtering, and data storage. Do not introduce Elasticsearch, message buses, or microservices unless standard SQL patterns are demonstrably insufficient.
3. **No Placeholders**: Do not check in "coming soon" tabs or empty mock screens. If a feature isn't complete, it should not appear in the UI.
4. **Community Signal First**: We rely on community reporting and manual curation. Do not build complex automated screening engines when simple curation works.

---

## 📂 Repository Layout

We use a type-safe TypeScript **Turborepo** monorepo running on **pnpm workspaces**:

- `apps/web`: Next.js web application.
- `apps/mobile`: Main React Native Expo user app.
- `apps/admin-mobile`: Moderation Expo mobile app.
- `apps/api`: Express/TypeScript API Gateway.
- `apps/worker`: BullMQ queue worker.
- `apps/ingestion`: Scrapers and link processors.
- `packages/database`: Prisma schema and PG clients.
- `packages/types`: Shared TypeScript interfaces.
- `packages/ui`: Design tokens and shared styling config.

---

## 🛠️ Dev Environment Setup

Read our detailed **[Onboarding & Setup Guide](./docs/setup.md)** to configure your local environment.

Key workflow rules:
- **Never run `npm` or `yarn` commands**. Always use `pnpm` (`pnpm install`, `pnpm dev`, etc.).
- Ensure your local Redis and PostgreSQL services are running.
- Set up local environment files (.env) by copying from the `.env.example` templates in each app folder.

---

## 🌿 Contribution Workflow

### 1. Issue Assignment
Please check our **[Launch Roadmap](./ROADMAP.md)** or open issues. If you want to work on something, comment on the issue so we can assign it to you.

### 2. Branching Strategy
- Fork the repository.
- Create a feature branch off `main` (e.g. `feat/mobile-notifications` or `fix/auth-token-refresh`).

### 3. Verification Steps
Before pushing your commits, run these validation scripts at the root of the repository:

```bash
# Typecheck the workspace
pnpm typecheck

# Lint all code
pnpm lint

# Ensure applications build cleanly
pnpm build
```

---

## 🚀 Releases & Standalone Builds

We trigger release builds using Git tags:
- Pushing a tag starting with `v` (e.g., `v1.2.0`) automatically kicks off the **Standalone Release APK** workflow.
- This compiles a production Android APK, uploads it, and creates a GitHub Release draft.
