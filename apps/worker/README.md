# FresherFlow Background Worker

Background job worker built with **Node.js** and **BullMQ**, designed to run intensive or asynchronous tasks such as scrapers, email/telegram dispatch, and indexing.

---

## 🚀 Tech Stack

- **Server**: Node.js with TypeScript
- **Task Processor**: BullMQ + Redis
- **Database**: PostgreSQL (Prisma ORM)

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Ensure the database and Redis instances are correctly configured.

---

## 🏃 Run Development

To run only the worker:
```bash
pnpm --filter ./apps/worker dev
```
The worker will listen on port `5001`.
