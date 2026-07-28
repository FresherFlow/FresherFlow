# FresherFlow Web

Next.js 16 App Router web portal.

- **Port**: `3000`
- **Styling**: Tailwind CSS with CSS variable tokens
- **Data**: CDN bootstrap feed (Cloudflare R2) + Express API via `packages/api-client`
- **Auth**: Firebase + JWT cookies

## Run locally

```bash
pnpm dev:web
```

## Environment

```bash
cp .env.example .env.local
```

Minimum required: `NEXT_PUBLIC_API_URL`, `API_URL`.

See root [QUICKSTART.md](../../QUICKSTART.md) for the full local setup guide.

## Structure

```
src/
├── app/            # App Router pages, layouts, API routes
├── features/       # Self-contained feature modules (opportunities, profile, auth...)
├── ui/             # Generic reusable components (Button, Badge, Card, Skeleton...)
├── hooks/          # Client-side hooks wrapping api-client
└── lib/
    ├── api/        # Server-side data fetching, CDN feed client, server-client
    └── utils/      # Formatting, sanitization, runtime config
```
