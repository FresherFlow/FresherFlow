# FresherFlow REST API Gateway

The backend REST API server serving both Web and Mobile clients, built with **Express** and **TypeScript**, using **Prisma ORM** to connect to **PostgreSQL**.

---

## 🚀 Tech Stack

- **Server**: Express (Node.js) with TypeScript
- **Database**: PostgreSQL (Prisma ORM)
- **Task Queue**: BullMQ + Redis
- **Auth**: Firebase Admin SDK integration

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Ensure the following variables are configured:
- `DATABASE_URL`: Connection string for PostgreSQL.
- `REDIS_URL`: Connection string for Redis instance.
- `FIREBASE_PROJECT_ID` & credentials: Required for user authentication vetting.

---

## 🏃 Run Development

To run only the API:
```bash
pnpm --filter fresherflow-api dev
```
The server will start on [http://localhost:5000](http://localhost:5000).

---

## 📂 Structure

- `src/routes`: Express route handlers grouped by access levels (`public`, `admin`, etc.).
- `src/domain`: Domain-specific business logic.
- `src/infrastructure`: Services interfacing with database, Telegram notifications, and S3/R2 storage.
