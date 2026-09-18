# 0001 — Where shared business rules and the Redis client live

- **Status:** proposed
- **Date:** 2026-09-11
- **Owner:** repository owner (needs a human decision, see Review)
- **Supersedes:** none
- **Superseded by:** none

## Context

Root `AGENTS.md` and seven skills tell agents that business rules live in
`packages/domain`, and root `AGENTS.md` says the Redis client lives in
`packages/redis`. Neither package exists.

Citations (line numbers re-verified 2026-09-11):

- `AGENTS.md:63`, `AGENTS.md:96`, `AGENTS.md:102`
- `AGENTS.md:69` for the Redis client
- `.agents/skills/architecture/SKILL.md:41`, `.agents/skills/api-development/SKILL.md:16`, `.agents/skills/package-development/SKILL.md:16`, `.agents/skills/new-endpoint/SKILL.md:67`, `.agents/skills/project-engineering/SKILL.md:14`
- `eslint.config.mjs:21`, `eslint.config.mjs:75`

Deduped 2026-09-11: both app guides no longer restate either fact, they link to
root `AGENTS.md`. The recurring cause is closed by the "One home per fact" rule in
root `AGENTS.md`; what remains open is the substance of this decision.

What is actually true:

- `packages/` contains `api-client, constants, database, frontend-core, parser, pipeline, plugins, queue, types, ui, utils`.
- `apps/api/src/domain` is also gone, so the "do not add new code there" warning protects a directory that no longer exists.
- `docs/ARCHITECTURE-TRUTH.md:109-111` records that shared rules currently live in `packages/types`, `packages/utils`, and API services instead. `docs/ARCHITECTURE-TRUTH.md:124-126` records that the Redis client is `packages/database/src/redis.ts:128-133`, re-exported by `packages/database/src/index.ts`.

Two consequences, both live today:

1. Every agent that reads `AGENTS.md` receives an instruction it cannot follow.
2. `apps/ingestion/tsconfig.json:18` and `:22` resolve to the missing paths, and line 18 is a duplicate of line 19, so the winner depends on the parser.

Full write-up: [`../learnings.md`](../learnings.md) findings 1 and 2.

## Decision

Not yet made. Recorded here because it is a strategic choice, not a documentation
fix, and it is currently being decided by accident.

## Options considered

| Option | Cost | Why not |
|---|---|---|
| A. Create `packages/domain` and `packages/redis` to match the guides | Two new packages, their build/typecheck wiring, and a migration of rules currently in `packages/types`, `packages/utils`, and API services. Redis becomes a second home for a client that is already exported from `packages/database` | No consumer asked for these packages. Creating them to satisfy stale prose is the "beautiful archive nobody uses" outcome, and a second Redis client is a real risk, not just clutter |
| B. Correct the guides to describe the repo as it is | Touches `AGENTS.md`, two app guides, and five skills. Rules stay scattered across three places, so "where does a new rule go" is answered by a convention instead of one importable package | Reneges on a boundary the repo clearly intended to have; the intention in the guides is coherent, only the implementation is missing |
| C. Correct the guides now, revisit package creation when legacy logic is actually being moved | Same as B, plus an accepted follow-up trigger | Defers the architectural goal, which is only acceptable if the trigger is real and gets recorded |

## Recommendation

Option C.

`docs/ARCHITECTURE-TRUTH.md` already documents the current layout, and it holds
source-order rank 1 in [`../README.md`](../README.md). The guides are costing
every agent a wrong instruction today, while creating empty packages costs build
wiring and a duplicate Redis client that nothing needs yet. Create the packages
when there is real legacy logic to move, not before.

## Consequences

- Fixing this removes a wrong instruction from every agent prompt. That is the entire benefit and it is immediate.
- Option C leaves shared rules scattered, so the "where does this rule go" question stays a convention rather than a package boundary.
- Reversal is cheap under C: correcting prose now does not block creating the packages later.
- Whichever option wins, `apps/ingestion/tsconfig.json` must be fixed either way, since a duplicate key is a defect regardless of the package's fate.

## How it will be enforced

After acceptance, these files must agree and be re-read together:

```bash
grep -rn "packages/domain\|packages/redis" AGENTS.md .agents/skills eslint.config.mjs apps/ingestion/tsconfig.json apps/web/tsconfig.json
pnpm typecheck
```

The grep must return no claim that the packages exist. `pnpm typecheck` proves
nothing was resolving through the stale aliases.

## Review

Needs a human decision before any file is edited. An agent may not mark this
accepted. Reopen if shared rules start being duplicated a third time, or when a
second consumer needs the Redis client.
