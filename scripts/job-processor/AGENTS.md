# FresherFlow Job Processor — AI Agent Guide

This file is for AI coding agents only.
Use it as the implementation playbook for modifying the job processor pipeline (`scripts/job-processor`).

For monorepo-wide rules, read the root [`AGENTS.md`](../../AGENTS.md) first.

---

## 1) Script Snapshot

- Runtime: Node.js (ESM)
- Language: TypeScript
- Browser automation: Playwright
- LLM enrichment: Gemini API
- Purpose: Takes raw discovered job URLs, scrapes full details, enriches with LLM, submits to API
- Input: `all_passed_jobs.json` from `scripts/job-discovery` (via R2)
- Output: Structured opportunity objects → submitted to `/api/opportunities/submit`

## 2) Processing Stages (Do Not Reorder)

```
Load Input → Scrape Page → Extract Metadata → LLM Enrichment → Normalize → Submit to API
```

1. **Load Input**: Reads `all_passed_jobs.json` from R2 or local file
2. **Scrape Page**: Playwright opens each job URL, extracts raw HTML/text
3. **Extract Metadata**: Provider-specific and generic extractors pull structured fields
4. **LLM Enrichment**: Gemini enriches unstructured description into structured fields (salary, skills, experience)
5. **Normalize**: `normalizer.ts` standardizes all fields to the `Opportunity` schema
6. **Submit to API**: POSTs to `/api/opportunities/submit`, handles dedup and errors

## 3) Key Files

| File | Purpose |
|---|---|
| `index.ts` | Entry point, orchestrates the full pipeline |
| `src/api.ts` | API submission — POST to backend |
| `src/browser.ts` | Playwright browser pool management |
| `src/ats-native.ts` | ATS-specific native API scrapers (no browser needed) |
| `src/providers.ts` | Provider-specific Playwright extraction logic per ATS |
| `src/metadata.ts` | Generic metadata extractor from raw HTML/JSON |
| `src/normalizer.ts` | Normalizes raw scraped data → `Opportunity` schema |
| `src/cdn-matcher.ts` | Matches companies to CDN logo/brand data |
| `src/rules.ts` | Post-processing business rules (expiry, type classification) |
| `src/parsers/` | NLP parsers for salary, location, experience level |

## 4) Standard Workflows

### Add support for a new ATS provider

1. Check if a native API exists for the provider — if yes, add to `src/ats-native.ts` (no browser needed, faster).
2. If native API unavailable, add Playwright extraction logic to `src/providers.ts` under the provider's name.
3. Add provider detection logic so the pipeline routes to the correct extractor.
4. Test against 3–5 real job URLs from that provider before enabling.

### Modify the LLM enrichment prompt

1. Gemini prompt lives inline in `index.ts` or a dedicated enrichment file.
2. Changes to the prompt directly affect data quality for ALL jobs — test with at least 10 diverse job descriptions.
3. Keep the output schema strict — the normalizer expects specific field names from LLM output.
4. Use `--no-llm` flag to bypass enrichment during debugging.

### Modify the normalizer

1. `src/normalizer.ts` maps raw scraped/LLM output → `Opportunity` type from `packages/types`.
2. Any field name or type change here must be reflected in `packages/types/src/index.ts`.
3. After changes, run the processor on a local sample file and inspect normalized output before submitting to API.

### Modify API submission

1. `src/api.ts` POSTs to `/api/opportunities/submit`.
2. Handles rate limiting, retries, and dedup (API returns 409 for duplicates — treat as success).
3. Do not increase concurrency above current limit without testing API stability.

## 5) Performance Guardrails

- Playwright is memory-heavy — process jobs in batches, not all at once.
- LLM calls cost money — do not call Gemini for jobs that already have complete structured data from native ATS APIs.
- API submission is rate-limited — respect the existing retry/backoff logic in `src/api.ts`.
- `processed_urls.json` must persist to R2, not local disk, to maintain dedup state across runs.

## 6) Naming Conventions

- Extractor files: descriptive noun (`ats-native.ts`, `providers.ts`, `metadata.ts`)
- Parser files: `<what>Parser.ts` inside `src/parsers/`
- Utility files: descriptive noun (`normalizer.ts`, `cdn-matcher.ts`)

## 7) High-Risk Files (Edit Carefully)

- `src/normalizer.ts` — shape changes break the `Opportunity` schema submitted to API
- `src/api.ts` — submission errors silently drop processed jobs; retry logic is critical
- `src/providers.ts` — provider-specific selectors break silently when ATS sites change layout
- `index.ts` — pipeline orchestration; stage reordering breaks enrichment quality

## 8) Validation Checklist

After every change:

```bash
pnpm typecheck   # run from repo root or scripts/job-processor
```

Then run locally against a test input file:

```bash
npx tsx index.ts --input test-jobs.json --no-submit   # process without submitting to API
```

- Inspect normalized output — verify all required `Opportunity` fields are populated.
- Check no unhandled errors for edge-case job descriptions (missing salary, no location, etc.).
- Verify dedup logic correctly skips already-processed URLs.
- For provider changes: test against 3–5 real URLs from that provider.
