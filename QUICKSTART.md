# FresherFlow — Local Development Quickstart

Get the **web app + API** running locally.

> **What runs locally:** Next.js web app + Express API + Redis (via Docker)
> **What stays in the cloud:** PostgreSQL (Neon), R2 CDN — you need connection strings for these

---

## Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- Docker Desktop (for Redis + Mailhog)
- A [Neon](https://neon.tech) account — free tier is enough

---

## 1. Clone & Install

```bash
git clone <repo-url>
cd fresherflow
pnpm install
```

---

## 2. Start Local Services (Redis + Mailhog)

```bash
docker compose up -d
```

This starts:
- **Redis** on `localhost:6379` — required for BullMQ queues and caching
- **Mailhog** on `localhost:8025` — catches outbound emails so nothing real is sent

PostgreSQL is **not** in Docker — FresherFlow uses [Neon](https://neon.tech) (cloud Postgres). Create a free project there and copy the connection string.

---

## 3. Set Up Environment Variables

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

### Minimum required vars for local dev

**`apps/api/.env` — set these to get started:**

```env
# From https://neon.tech → your project → Connection string
DATABASE_URL="postgresql://user:password@ep-xxxx.neon.tech/neondb?sslmode=require"

# Redis (Docker is running this locally)
REDIS_URL="redis://localhost:6379"

# JWT secrets — any long random string works locally
JWT_ACCESS_SECRET="local-dev-access-secret-minimum-32-chars"
JWT_REFRESH_SECRET="local-dev-refresh-secret-minimum-32-chars"

# CORS
FRONTEND_URL="http://localhost:3000"
FRONTEND_URLS="http://localhost:3000"

NODE_ENV="development"
```

Everything else in `.env.example` is optional for basic local dev — Firebase, R2, Telegram, push notifications etc. can be left blank.

**`apps/web/.env` — set these:**

```env
NEXT_PUBLIC_API_URL="http://localhost:5000"
API_URL="http://localhost:5000"
```

---

## 4. Run the Stack

Run API and web in two separate terminals:

```bash
# Terminal 1 — API (runs on port 5000)
pnpm dev:api

# Terminal 2 — Web (runs on port 3000)
pnpm dev:web
```

Or both together:

```bash
pnpm dev:stack
```

> `pnpm dev` (no suffix) starts everything including mobile, worker, and ingestion. Only use this if you need the full stack.

---

## Available Dev Commands

| Command | What it starts |
|---|---|
| `pnpm dev:api` | API only (port 5000) |
| `pnpm dev:web` | Web only (port 3000) |
| `pnpm dev:stack` | API + Web together |
| `pnpm dev:worker` | Background job worker |
| `pnpm dev:mobile` | Expo mobile app |
| `pnpm dev:admin-mobile` | Expo admin app |
| `pnpm dev` | Everything (all apps) |

---

## Common Problems

| Error | Fix |
|---|---|
| `BullMQ connection refused` | Redis isn't running — run `docker compose up -d` |
| `Cannot find module` or Prisma errors | Run `pnpm install` then `pnpm db:generate` |
| `DATABASE_URL not set` / Zod errors on boot | Copy `.env.example` and fill in your Neon URL |
| Port 5000 already in use | Run `pnpm kill:port` to free it |
| Port 3000 already in use | Run `pnpm kill:web-port` to free it |
| `npm install` broke workspace | This repo uses `pnpm`. Delete `node_modules`, run `pnpm install` |

---

## Mailhog (Email Testing)

Any emails the API sends in local dev go to Mailhog, not real inboxes.
Open `http://localhost:8025` to read them.
