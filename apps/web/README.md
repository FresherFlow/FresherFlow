# FresherFlow Web App (Next.js)

The user-facing web portal for FresherFlow, built with **Next.js** using the App Router, optimized for fast page loads and eligibility matchmaking.

---

## 🚀 Tech Stack

- **Framework**: Next.js 16 (React 19)
- **Styling**: Tailwind CSS
- **Routing**: App Router with sub-domain resolution and rewrites
- **Data Hydration**: CDN-first, caching static data using R2 and local caches

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` (or `.env.local` for local development):
```bash
cp .env.example .env.local
```

Key environment variables:
- `NEXT_PUBLIC_API_URL`: Root endpoint of the API gateway (e.g. `http://localhost:5000`).
- `NEXT_PUBLIC_ADMIN_WEB_HOST`: Hostname for the admin portal (e.g. `admin.localhost`).
- `NEXT_PUBLIC_APP_WEB_HOST`: Hostname for the user app (e.g. `localhost`).

---

## 🏃 Run Development

To run only the web client:
```bash
pnpm --filter fresherflow-web dev
```
The server will start on [http://localhost:3000](http://localhost:3000).

---

## 📂 Structure

- `src/app`: Page routing, layouts, and API proxies.
- `src/components`: Generic UI elements.
- `src/features`: Component-driven feature folders (e.g., `jobs`, `opportunities`, `landing`).
- `src/proxy`: Middleware host-rewriting logic.
