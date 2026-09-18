# FresherFlow Work Register

This folder is the **single task list** for the whole `docs/plans` pack (39 docs).
It merges every plan into actionable tasks, gives each task one owner agent, and
records dependencies and acceptance checks so agents never overlap.

## Files

| File | Purpose |
|---|---|
| `TASKS.md` | The master register. Every task, owner, source doc, dependency, acceptance, status. |
| `agents/api.md` | `api-engineer` scoped brief |
| `agents/packages.md` | `package-engineer` scoped brief |
| `agents/web.md` | `web-engineer` scoped brief |
| `agents/mobile.md` | `mobile-engineer` scoped brief |
| `agents/pipeline.md` | `pipeline-engineer` scoped brief |
| `agents/design.md` | `ui-designer` scoped brief |
| `agents/platform.md` | root tooling / CI / deploy brief |
| `agents/admin.md` | `admin-engineer` scoped brief |
| `agents/research.md` | `researcher` (read-only docs) brief |

## How to use it

1. Read `TASKS.md` top to bottom once.
2. Open your agent file. Work only your rows.
3. Take tasks in the dependency order shown. Do not start a task whose
   dependency is not `DONE`.
4. One task = one owner. If you need a file owned by another agent's task,
   ask; do not edit it.
5. Update the `Status` column in `TASKS.md` when you finish (and add the
   evidence command result).

## Status legend

| Status | Meaning |
|---|---|
| `DONE` | Implemented and verified in the worktree |
| `DOING` | Started, not verified |
| `TODO` | Not started, unblocked |
| `BLOCKED` | Cannot start until a listed dependency lands |
| `FROZEN` | Deliberately out of scope until the contract says otherwise |
| `HANDOFF` | Done by one agent, needs owner verification |

## Non-negotiable rules (from root `AGENTS.md`)

- One home per fact. If the same rule lives in two places, delete one.
- Frontends never import Prisma or `apps/api`; they call `packages/api-client`.
- API routes validate (Zod) then delegate to a service.
- Multi-table writes use `prisma.$transaction`.
- Heavy work (feed regen, push, OG) goes to BullMQ, never a request handler.
- Public routes keep a rate limit; user-owned queries filter by `req.userId`.
- Do not run destructive git commands or `db:push` unless the owner asks.
- Additive schema only in the rebuild tranches.

## Where the source docs live

`docs/plans/` is grouped by workstream, and each workstream's documents are
merged into one `PLAN.md`. Resolve a `Source` cell like `09b §6` to the folder
below, then find the `<!-- ===== source: <file> ===== -->` marker inside that
folder's `PLAN.md`.

| Doc | Folder + file |
|---|---|
| 00, 01, 02, 11, 12, 13 | `docs/plans/01-product-foundation/PLAN.md` |
| 09, 09a-09e, 23, 24, 27, 28 | `docs/plans/02-community-rebuild/PLAN.md` |
| 03, 04 | `docs/plans/03-public-web-and-data/PLAN.md` |
| 15-22 | `docs/plans/04-frontend-stack/PLAN.md` |
| 08, 14a-14e, 25, 26 | `docs/plans/05-execution-and-audits/PLAN.md` |
| 06 | `docs/plans/06-mobile-retention/PLAN.md` |
| 05 | `docs/plans/07-recruiter-and-org/PLAN.md` |
| 07 | `docs/plans/08-open-source/PLAN.md` |
| 10 | `docs/plans/09-messaging-and-copy/PLAN.md` |

Example: `09b §6` is inside `docs/plans/02-community-rebuild/PLAN.md`, under
`<!-- ===== source: 09b-data-and-api.md ===== -->`. Merged files are verbatim:
no source line was dropped.

## Contract authority

When a task and a plan disagree, the **product contract** wins:
doc 11 (`docs/plans/01-product-foundation/PLAN.md`, source
`11-what-we-give-product-contract.md`) > `09*` > `14*` > `15-22` > `23-28`.

## Snapshot

- 39 plan docs, ~4,900 lines, merged into **87 tasks** across 14 workstreams.
- Statuses were last re-verified against the worktree on **2026-09-13**; the
  commands and results are in `TASKS.md` under `## Verification log`.
- Live buildable surfaces during the rebuild: **web, api, mobile** (11 §5).
- `apps/admin-mobile` is frozen; recruiter/org/campus surfaces are frozen (11 §3).
