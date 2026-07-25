# FresherFlow API

Express + TypeScript REST API serving the web and mobile clients.

- **Port**: `5000`
- **Database**: PostgreSQL via Prisma ORM
- **Cache / Queues**: Redis + BullMQ
- **Auth**: JWT + Firebase Admin SDK

## Run locally

```bash
pnpm dev:api
```

## Environment

```bash
cp .env.example .env
```

Minimum required: `DATABASE_URL` (Neon), `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`.

See root [QUICKSTART.md](../../QUICKSTART.md) for the full local setup guide.

## Structure

```
src/
├── routes/         # Express routers — thin, validation only
├── application/    # Controllers — request/response, no business logic
├── domain/         # Core business logic, pure functions
├── infrastructure/ # Prisma queries, external services (R2, Telegram, email)
├── middleware/     # Auth, rate limiting, validation, error handler
└── cron/           # Scheduled background jobs
```
