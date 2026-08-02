# FresherFlow job discovery agent guide

This file is for AI coding agents working in `scripts/job-discovery`. Read the root `AGENTS.md` first.

## Script profile

| Concern | Value |
|---|---|
| Runtime | Node.js, ESM |
| Language | TypeScript |
| Browser automation | Playwright |
| Purpose | Discover new job listings from ATS boards and aggregators |
| Trigger | GitHub Actions schedule or manual run |
| Output | Passed job candidates uploaded to R2 for the processor |

## Pipeline stages

Do not reorder stages.

1. ATS discovery
2. Aggregator discovery
3. Verification
4. Storage
5. Notification

Each stage owns its own counters and failure handling. Do not hide stage failures by swallowing errors without updating run stats.

## Stage ownership

| Stage | Owns |
|---|---|
| ATS discovery | Direct provider APIs and native board feeds |
| Aggregator discovery | Playwright scraping of configured aggregator pages |
| Verification | Live URL checks, India or remote filters, fresher filters, scorer result |
| Storage | R2 uploads and visited URL state |
| Notification | Telegram and GitHub step summary |

## R2 state policy

R2 is the source of truth for pipeline state.

- Load visited URL state from R2 at run start
- Save visited URL state to R2 at run end
- Do not persist state in tracked local files
- Do not commit generated job dumps, debug outputs, or scratch files
- Temporary scratch files belong in ignored scratch paths and must be removed when done
- Keep state shape changes backward compatible or add migration logic

## ATS provider rules

- Prefer native ATS APIs over browser scraping
- Add provider logic under `src/ats/`
- Register providers through the existing provider index
- Filter location before queueing candidates when provider data supports it
- Normalize apply URLs before dedup
- Set network timeouts for new provider fetches
- Keep provider failures isolated so one provider does not fail the whole run

## Aggregator rules

- Add aggregator config to `aggregators.json`
- Use precise selectors and stable URL patterns
- Keep Playwright work bounded by configured limits
- Do not increase broad crawl depth without proving yield and cost
- Test selectors with dry run before enabling scheduled use
- Sync production config through the approved R2 or admin path when required

## Playwright concurrency

Playwright is memory-heavy.

- Preserve existing concurrency caps unless measurement supports a change
- Close pages and contexts after use
- Use timeouts on navigation and selectors
- Avoid screenshots, videos, and traces in scheduled runs unless debugging
- Do not launch unbounded browser tasks from arrays of URLs

## URL and domain safety

- Parse URLs with `new URL()`
- Validate `http:` or `https:` protocols before fetch or browser navigation
- Check `hostname`, not raw string substrings
- Normalize hostnames to lowercase
- Block unsupported protocols
- Strip tracking parameters only through existing URL helpers or reviewed logic

## Key files

| File | Purpose |
|---|---|
| `index.ts` | Pipeline entry point |
| `src/pipeline/state.ts` | Discovery state and run stats |
| `src/pipeline/verifier.ts` | Verification workers |
| `src/pipeline/storage.ts` | R2 upload and state persistence |
| `src/pipeline/notifier.ts` | Telegram and GitHub summaries |
| `src/config.ts` | Runtime config |
| `aggregators.json` | Aggregator definitions |
| `src/ats/` | Native ATS provider fetchers |
| `src/filters/scorer.ts` | Job scorer |
| `src/filters/ats-filters.ts` | Location and fresher filters |
| `src/core/raw-fetcher.ts` | Native API fast path |

## Standard workflow

### Add a provider

1. Add provider fetch logic under `src/ats/`
2. Register the provider in the existing index
3. Normalize and dedup apply URLs
4. Apply location and fresher filters before queueing when possible
5. Run dry validation with the test flag
6. Inspect run stats for provider yield and rejection reasons

### Change verification

1. Read `src/pipeline/verifier.ts` and `src/pipeline/state.ts`
2. Preserve state counters and failure categories
3. Keep native fetch before browser verification
4. Keep concurrency bounded
5. Run dry validation and inspect rejected counters

## LLM and scoring policy

Discovery should stay cheap and deterministic.

- Keep scorer logic pure and side-effect free
- Do not add network calls inside scoring functions
- Do not add large language model calls to discovery without an explicit cost gate
- Track reject reasons in run stats when changing scorer logic

## Validation

Run type checks:

```bash
pnpm --filter ./scripts/job-discovery typecheck
```

Run dry validation:

```bash
npx tsx index.ts --test
```

Verify:

- No R2 upload occurs in test mode
- No Telegram message sends in test mode
- Provider counts and reject counters look plausible
- No unhandled promise rejections occur
- No scratch files are staged or committed
