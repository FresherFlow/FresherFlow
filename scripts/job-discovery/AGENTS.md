# FresherFlow Job Discovery — AI Agent Guide

This file is for AI coding agents only.
Use it as the implementation playbook for modifying the job discovery pipeline (`scripts/job-discovery`).

For monorepo-wide rules, read the root [`AGENTS.md`](../../AGENTS.md) first.

---

## 1) Script Snapshot

- Runtime: Node.js (ESM)
- Language: TypeScript
- Browser automation: Playwright
- Purpose: Discover new job listings from ATS boards and aggregator sites
- Trigger: GitHub Actions (scheduled) or manual run
- Output: `all_passed_jobs.json` → uploaded to R2 → consumed by `job-processor`

## 2) Pipeline Stages (Do Not Reorder)

```
ATS Discovery → Aggregator Discovery → Verification → Storage → Notification
```

1. **ATS Discovery**: Fetches job listings directly from ATS provider APIs (Greenhouse, Lever, Workday, etc.)
2. **Aggregator Discovery**: Scrapes aggregator sites (Naukri, Freshersvoice, etc.) via Playwright
3. **Verification**: Confirms jobs are live, India/remote, pass NLP scorer
4. **Storage**: Uploads results to R2, persists visited URLs state
5. **Notification**: Sends Telegram message with run summary, writes GitHub step summary

## 3) Key Files

| File | Purpose |
|---|---|
| `index.ts` | Pipeline entry point |
| `src/pipeline/state.ts` | `DiscoveryState` and `RunStats` shapes — **high risk** |
| `src/pipeline/verifier.ts` | ATS + aggregator verification workers |
| `src/pipeline/storage.ts` | R2 upload, visited URL persistence |
| `src/pipeline/notifier.ts` | Telegram notification, GitHub step summary |
| `src/config.ts` | File paths, CDN URLs, environment config |
| `aggregators.json` | List of aggregator sites to scrape |
| `src/ats/` | ATS provider-specific API fetch logic |
| `src/filters/scorer.ts` | NLP job title/description scorer (PASS/REJECT) |
| `src/filters/ats-filters.ts` | Location and fresher-level filters |
| `src/core/raw-fetcher.ts` | Native ATS API fast-path fetcher |
| `src/core/verifier.ts` | Playwright-based live job verification |
| `src/utils/telegram.ts` | Telegram notification sender |

## 4) State Shape (Read Before Touching Anything)

All pipeline state flows through `DiscoveryState` in `src/pipeline/state.ts`.

- `state.visited` — dedup map, keyed by `"__discovered_apply_links__"`. Loaded from R2 at start, saved to R2 at end.
- `state.candidateQueue` — jobs waiting for verification. Cleared between phases.
- `state.newJobsFound` — confirmed new jobs. Populated by verifier, consumed by storage/notifier.
- `state.stats` — `RunStats` counters. Tracked throughout pipeline for reporting.

**Do not** add local file writes for state — state persists in R2 only.

## 5) Standard Workflows

### Add a new ATS provider

1. Add provider fetch logic under `src/ats/<provider>.ts`.
2. Update `src/ats/index.ts` to register the new provider.
3. Add test entry to `aggregators.json` if it's aggregator-style rather than direct API.
4. Verify it respects the `isLocationIndiaOrRemote` filter before queueing candidates.

### Add a new aggregator site

1. Add entry to `aggregators.json` with name, URL, and selector config.
2. **Do not just commit the local file** — after testing, sync `aggregators.json` to R2 CDN via admin action.
3. Test locally with `--test` flag to verify selectors work before enabling.

### Modify the scorer

1. `src/filters/scorer.ts` — edit scoring rules here.
2. Keep the scorer pure — no side effects, no network calls.
3. After changes, run a dry-run pass and inspect `ats_rejected_scorer` and `agg_rejected_scorer` counters in `RunStats` to confirm expected yield change.

### Modify verification logic

1. Read `src/pipeline/verifier.ts` fully before editing.
2. Verifier runs with `VERIFIER_CONCURRENCY = 4` parallel workers — do not increase without testing memory.
3. Fast path (native API fetch via `tryFetchNativeApi`) runs before Playwright — preserve this optimization.

## 6) Performance Guardrails

- Verifier concurrency is capped at 4 — Playwright is memory-heavy.
- Visited URL list is capped at 50,000 entries in memory — the cap is enforced in verifier, preserve it.
- Do not load or write `visited_urls.json` from/to local disk — use R2 only.
- ATS API fetches are network-bound — add timeouts to any new fetch call.

## 7) Naming Conventions

- Pipeline stage files: verb noun (`verifier.ts`, `notifier.ts`, `storage.ts`)
- ATS provider files: lowercase provider name (`greenhouse.ts`, `lever.ts`)
- Filter utilities: descriptive noun (`ats-filters.ts`, `scorer.ts`)

## 8) High-Risk Files (Edit Carefully)

- `src/pipeline/state.ts` — shape changes break all downstream pipeline stages
- `src/filters/scorer.ts` — score threshold changes directly affect how many jobs pass
- `src/pipeline/storage.ts` — R2 upload failures silently drop discovered jobs
- `aggregators.json` — broken selectors cause silent zero-yield from affected sites

## 9) Testing & Scratch Files

- **Do NOT spam test scripts in the root directory.**
- Any temporary, one-off, or scratch test files (e.g., `test-capco.ts`, `test-lennox.ts`) must be created inside a `scratch/` folder or the agent's dedicated artifacts directory (e.g., `<appDataDir>/brain/<conversation-id>/scratch/`).
- If you create scratch files in `scripts/job-discovery/scratch/`, make sure to delete them after use, or ensure they are `.gitignore`d.
- Never commit one-off debug scripts to version control.

## 10) Validation Checklist

After every change:

```bash
pnpm typecheck   # run from repo root or scripts/job-discovery
```

Then run locally:

```bash
npx tsx index.ts --test    # dry run, no R2 uploads, no Telegram
```

- Check `RunStats` output in console — verify `total_found`, per-provider counts.
- Verify `ats_rejected_scorer` and `agg_rejected_scorer` didn't spike unexpectedly.
- Verify no unhandled promise rejections in Playwright browser pool.

## 11) Pipeline Security & CodeQL Guidelines

- **URL & Domain Verification**: In verifiers and detectors (`verifier.ts`, `ats-detector.ts`), NEVER use `url.includes('google.com')` on raw URL strings to verify ATS domains or account check bypasses. ALWAYS parse via `new URL(url).hostname`.
- **Sanitization & Escaping**: In HTML parsers (e.g. Greenhouse adapter), replace entities with spaces `' '` instead of empty strings `''` to prevent multi-character sanitization issues, and avoid nested regex patterns on scraped HTML content.

## 12) Subagents for This Script

Agents that work in `scripts/job-discovery`. Run `manage_subagents list` before spawning — reuse if already alive.

| Role | TypeName | What they do here |
|---|---|---|
| `pipeline-engineer` | `self` | All work in this folder — ATS providers, aggregator scraping, NLP scorer, verifier, R2 storage, Telegram notifier. |

### Delegation example

```
Role: pipeline-engineer
Prompt: "Add Instahyre as a new ATS provider.
  - Add fetch logic: scripts/job-discovery/src/ats/instahyre.ts (new file)
  - Register in: scripts/job-discovery/src/ats/index.ts:L22
  - Filter with isLocationIndiaOrRemote before queueing candidates
  - Test: npx tsx index.ts --test
  After: pnpm typecheck"
```
