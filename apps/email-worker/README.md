# FresherFlow Email Ingestion Worker

Cloudflare Worker that receives inbound company job-alert emails and forwards normalized payloads to API ingestion.

## What it does

1. Receives mail from Cloudflare Email Routing
2. Parses subject/body with `postal-mime`
3. Extracts links from email text/html
4. Sends payload to `POST /api/ingestion/email`
5. On failure, forwards message to fallback mailbox (if configured)

## Required secrets

Set with Wrangler:

```bash
wrangler secret put INGESTION_WORKER_TOKEN
wrangler secret put FALLBACK_FORWARD_TO
```

Required:
- `INGESTION_WORKER_TOKEN`

Optional:
- `FALLBACK_FORWARD_TO` (ex: `ops@fresherflow.in`)

## Config vars (`wrangler.toml`)

- `API_BASE_URL` (ex: `https://api.fresherflow.in`)
- `SOURCE_LABEL` (default `company_email`)

## Local commands

```bash
npm install --workspace=apps/email-worker
npm run typecheck --workspace=apps/email-worker
npm run dev --workspace=apps/email-worker
```

## Deploy

```bash
npm run deploy --workspace=apps/email-worker
```

Then in Cloudflare Email Routing:
- Route `sources@fresherflow.in` to this worker.

## API contract expected

`POST /api/ingestion/email` JSON body:

- `sourceLabel`
- `envelope.from`
- `envelope.to`
- `messageId`
- `subject`
- `text`
- `html`
- `links[]`
- `receivedAt`
