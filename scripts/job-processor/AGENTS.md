# FresherFlow job processor agent guide

This file is for AI coding agents working in `scripts/job-processor`. Read the root `AGENTS.md` first.

## Script profile

| Concern | Value |
|---|---|
| Runtime | Node.js, ESM |
| Language | TypeScript |
| Browser automation | Playwright (fallback only) |
| Data extraction | Native ATS APIs + plugins (no LLM) |
| Purpose | Second pass: normalize and submit discovery content |
| Input | Discovery output from R2/Supabase `discovered_jobs` |
| Output | Structured opportunities submitted to the API |

## Processing stages

Do not reorder stages.

1. Load input
2. Consume pre-supplied discovery content (preferred, no re-fetch)
3. Native ATS extraction (fallback when no content stored)
4. Browser scrape (fallback when no content stored)
5. Metadata extraction
6. Normalize
7. Submit to API
8. Persist dedup state

Each stage should keep enough context for error reporting without logging secrets or full personal data.

## Stage ownership

| Stage | Owns |
|---|---|
| Load input | R2 or explicit local dry-run file |
| Native ATS extraction | Provider APIs that avoid browser cost |
| Browser scrape | Playwright fallback extraction |
| Metadata extraction | HTML, JSON-LD, Open Graph, and provider fields |
| Normalize | API-ready opportunity shape |
| Submit | API contract, retry, dedup handling |
| Dedup state | Processed URL state in R2 |

## Content priority

The processor is a second pass over discovery output. Discovery already fetched and
stored the content, so the processor reuses it instead of re-scraping.

1. Pre-supplied discovery content (`atsText`/`description` stored in `discovered_jobs`) — no re-fetch
2. Structured discovery fields (title + company + skills) — no browser
3. Native ATS JSON extraction (Lever, Greenhouse, Ashby, SmartRecruiters)
4. Browser scrape (fallback only, when no content is stored)

Priority rules:

- Consume stored content before opening any browser or calling native APIs
- Never call an LLM — extraction is 100% plugin and rule based
- Do not open a browser for URLs already handled by native providers
- Keep provider-specific extraction isolated
- Add timeouts and failure categories for new providers

## No LLM policy

The processor never calls an LLM. All extraction is deterministic.

- Reject any change that introduces Gemini, OpenAI, or any model call into the processor
- `packages/plugins` and `packages/pipeline` adapters own extraction
- Fix extraction quality in the plugins or rule engine, never by adding a model call

## Normalization and API submit contract

`src/normalizer.ts` must produce the shape expected by the API and `packages/types`.

- Normalize salary, location, experience, skills, company, and apply URL consistently
- Preserve source URL and provider identifiers for dedup and audit
- Treat API duplicate responses as successful skips when existing logic does so
- Respect API retry and backoff behavior
- Do not increase submit concurrency without API stability testing
- Keep request payloads typed and serializable

If a field shape changes, update `packages/types`, `packages/api-client`, and the API contract in the same feature branch.

## Dedup state policy

R2 is the source of truth for processed URL state.

- Load processed state from R2 unless using an explicit dry-run input
- Persist processed state to R2 after successful processing when not in dry-run mode
- Do not commit `processed_urls.json`, output dumps, or scratch files
- Normalize URLs before checking dedup state
- Treat duplicate API responses as non-fatal

## URL and scraping safety

- Parse URLs with `new URL()`
- Validate `http:` or `https:` before fetch or browser navigation
- Check `hostname`, not raw string substrings
- Close pages and contexts after use
- Keep Playwright concurrency bounded
- Do not capture traces, videos, or screenshots in scheduled runs unless debugging
- Avoid unsafe regex sanitizers on raw HTML

## Key files

| File | Purpose |
|---|---|
| `index.ts` | Pipeline orchestration |
| `src/api.ts` | API submission |
| `src/browser.ts` | Playwright browser pool |
| `src/ats-native.ts` | Native ATS extraction |
| `src/metadata.ts` | Generic metadata extraction |
| `src/normalizer.ts` | API-ready normalization |
| `src/cdn-matcher.ts` | Company and logo matching |
| `src/rules.ts` | Post-processing rules |
| `src/parsers/` | Salary, location, and experience parsers |

## Standard workflow

### Add provider support

1. Check for a native API first
2. Add native extraction when possible
3. Add browser fallback only when needed
4. Add provider detection
5. Test with several real URLs in no-submit mode
6. Verify normalized output before API submit

### Change API submission

1. Read `src/api.ts`
2. Preserve retry, backoff, and duplicate handling
3. Keep request shape aligned with API validation
4. Run no-submit mode first
5. Run a limited submit only when explicitly approved

## Validation

Run type checks:

```bash
pnpm --filter ./scripts/job-processor typecheck
```

Run dry validation:

```bash
npx tsx index.ts --input test-jobs.json --no-submit
```

Verify:

- Pre-supplied discovery content is consumed before native API or browser fallback
- No LLM call exists anywhere in the processor
- Normalized output has all required API fields
- Duplicate URLs are skipped or treated as successful duplicates
- No production R2 state changes happen in dry-run mode
- No scratch files are staged or committed
