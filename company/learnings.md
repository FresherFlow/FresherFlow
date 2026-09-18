# Learnings

Reviewed corrections worth keeping, and the open findings waiting for review.

The useful question about any bad output is not "how do I fix this sentence" but
"why was the wrong thing still there". Fix that layer and the correction survives
the next task.

## The loop

```
work -> correction -> route -> review -> share -> better future work
```

## Routing table

| Finding | Route to | Then |
|---|---|---|
| Missing or outdated fact | the file that owns it | fix the source, no review needed |
| New strategic choice | `decisions/` record | review, then share |
| Repeated preference | policy in `AGENTS.md` or an app guide | review, then share |
| Proven technique | `.agents/skills/*/SKILL.md` | review, then share |
| Repeatable sequence | `workers/` spec | review, then share |
| Dangerous action | a mechanical gate, not a prompt | review before enabling |

## Review rules

- One correction, one home. If two files need the fact, one links to the other.
- A guess never becomes company knowledge. If the source is missing, write what could not be found.
- One strong result creates a hypothesis, not a universal rule.
- Corrections to `docs/ARCHITECTURE-TRUTH.md` are welcome and should keep its `file:line` convention.

---

## Open corrections (pending review)

Verified against the worktree on 2026-09-11. None of these have been applied yet.

### 1. `packages/domain` is named as a source of truth and does not exist

Type: missing or outdated fact. Impact: high, because every agent that reads the
root guide is told to put business rules in a package it cannot import.

Referenced at (line numbers re-verified 2026-09-11 after the dedupe pass):

- `AGENTS.md:63` — "Business rules | `packages/domain`"
- `AGENTS.md:96` — "Business rules that can survive a backend rewrite belong in `packages/domain`"
- `AGENTS.md:102` — "Do not add new code under `apps/api/src/domain`. Move legacy logic to `packages/domain`…"
- Seven skills: `.agents/skills/architecture/SKILL.md:41,53,54`, `.agents/skills/api-development/SKILL.md:16`, `.agents/skills/package-development/SKILL.md:16`, `.agents/skills/new-endpoint/SKILL.md:67`, `.agents/skills/project-engineering/SKILL.md:14,88,148,157,210`, `.agents/skills/debugging/SKILL.md:24`, `.agents/skills/fresherflow-api-context/SKILL.md:42`
- `eslint.config.mjs:21` and `eslint.config.mjs:75` — lint config still targets `packages/domain`
- `apps/ingestion/tsconfig.json:18` and `apps/web/tsconfig.json:25-26` — see findings 3 and 4

Deduped 2026-09-11: `apps/api/AGENTS.md` and `apps/web/AGENTS.md` no longer restate
this fact. They link to root `AGENTS.md`, which is now its only home among the
guides. The substance is still unreviewed, so this finding stays open.

Reality:

- `packages/` contains `api-client, constants, database, frontend-core, parser, pipeline, plugins, queue, types, ui, utils`. There is no `domain`.
- `apps/api/src/domain` is gone as well, so the legacy path the root guide warns about no longer exists.
- `docs/ARCHITECTURE-TRUTH.md:109-111` says it plainly: business rules live in `packages/domain`, "which does not exist yet, so shared rules currently live in `packages/types`, `packages/utils`, and API services". `docs/ARCHITECTURE-TRUTH.md:440` repeats it under Known gaps.

Two sources conflict, so the source order in `company/README.md` applies and the
guides are the wrong one. Tracked as a decision in
[`decisions/0001-shared-rules-location.md`](./decisions/0001-shared-rules-location.md).

### 2. `packages/redis` is named as a source of truth and does not exist

Type: missing or outdated fact.

- `AGENTS.md:69` — "Redis clients | `packages/redis`"
- Deduped 2026-09-11: `apps/api/AGENTS.md:13` now links to the root row instead of restating it.

Reality: `docs/ARCHITECTURE-TRUTH.md:124-126` — the client is
`packages/database/src/redis.ts:128-133`, re-exported by
`packages/database/src/index.ts`, and there is no `packages/redis/` directory.
`packages/queue/src/index.ts:4` imports it as `import { redis } from
'@fresherflow/database'`, so the real client is already in use and the guides
name a package that nothing imports.

Fix: point both guides at `packages/database`. `AGENTS.md:62` already names it for
the Prisma client, so this is a two-line edit.

### 3. `apps/ingestion/tsconfig.json` has a duplicate key and a dead alias

Type: missing or outdated fact, with a possible code smell.

- Line 18: `"@fresherflow/utils": ["../../packages/domain/src/index.ts"]` — path does not exist.
- Line 19: `"@fresherflow/utils": ["../../packages/utils/src/index.ts"]` — same key declared again.
- Line 22: `"@fresherflow/database": ["../../packages/redis/src/index.ts"]` — path does not exist.

A duplicate key means one of the two is silently discarded, so the intended
resolution is ambiguous rather than merely stale. The names are also crossed:
`utils` points at a `domain` path, `database` at a `redis` path.

Fix: delete line 18, repoint line 22 at `../../packages/database/src/index.ts`,
then check whether anything under `apps/ingestion/src` was compiling only because
the wrong alias was winning.

### 4. `apps/web/tsconfig.json` aliases a package that does not exist

Type: missing or outdated fact.

- Lines 25-26: `"@repo/domain": ["../../packages/domain/src"]` and `@repo/domain/*`.

Harmless while nothing imports it, but it encodes the same stale assumption as
finding 1 and will mislead the next person who does import it.

### 5. `ROADMAP.md` links to a directory that does not exist

Type: missing or outdated fact.

- `ROADMAP.md:11` links to `./planning/plans/README.md`, and there is no `planning/` directory.
- The planning pack is `docs/plans/README.md`.

Fix: repoint the link.

### 6. Five code areas have no agent guide

Type: missing coverage, not a wrong claim.

`AGENTS.md` links guides for `apps/web`, `apps/api`, `apps/mobile`,
`apps/admin-mobile`, `scripts/job-discovery`, `scripts/job-processor`.

No guide exists for `apps/ingestion`, `apps/worker`, `scripts/search`,
`scripts/seo-audit`, `scripts/sweeper`.

Fix: add guides as those areas are touched, not up front. Two carry real risk
today: `apps/worker` consumes the queues, and `apps/ingestion` has finding 3.

---

## Accepted lessons

Reviewed and in force. Each cites where it comes from.

| Lesson | Source |
|---|---|
| Every structural claim about this repo carries a `file:line` citation, re-verifiable with grep | `docs/ARCHITECTURE-TRUTH.md` header |
| The database is the canonical authoring and moderation plane; CDN JSON is the delivery plane for public reads | `docs/plans/README.md` non-negotiable rules |
| A plan item must name the files, modules, and validation commands involved | `docs/plans/README.md` non-negotiable rules |

## Keep / test / stop

Filled in at review time, not maintained continuously.

- **Keep** — patterns that worked repeatedly and still match the strategy.
- **Test** — promising patterns that need one more controlled attempt.
- **Stop** — repeatedly weak patterns, duplicated formats, or expensive work with no useful result.

Empty until the first review.
