# FresherFlow — Company Map

The front door for agents working in this repo. Read this first, then open only
the room you need.

Structure follows the company-brain model in the VibeMarketer article
("How to Build a Company Brain That Gets Smarter Every Week"): a tiny map, a
correction loop, and one home for company knowledge.

Every fact in this file was verified against the worktree on 2026-09-11. Where a
claim about the repo is structural, it carries a `file:line` citation, the same
convention `docs/ARCHITECTURE-TRUTH.md` uses.

## What we do

FresherFlow is a **community exchange for entry-level hiring in India**:
freshers share real jobs with each other (official links), verify them together
(signals like CLOSED / INCORRECT / OFFER, reports), and help each other get
hired — referrals, real salary reports, interview experiences, per-company
hubs. Landing copy has said it all along: "Jobs, powered by freshers"
(`apps/web/src/app/(public)/page.tsx:19`).

We are not a job board (we do not compete on listing volume) and not a scraping
engine (monitoring thousands of ATS systems is infeasible at our size). The
ATS/discovery pipeline is a **candidate feeder** into the community/curation
flow, not the product. The trust layer is the moat: users report a dead link
the moment they hit it — a freshness mechanism no scraper can replicate at our
scale.

> Identity framing is being settled in
> [`decisions/0002-identity-community-exchange-not-scraper-or-board.md`](./decisions/0002-identity-community-exchange-not-scraper-or-board.md)
> (proposed). This section already reflects it; `ROADMAP.md` still carries the
> older ATS-Registry wording until that decision is accepted.

| Surface | Role |
|---|---|
| Web (`apps/web`) | public discovery, SEO, trust |
| Mobile (`apps/mobile`) | retention |
| Admin mobile (`apps/admin-mobile`) | moderation and operations |
| API (`apps/api`) | canonical authoring and moderation plane |
| Worker (`apps/worker`), ingestion (`apps/ingestion`) | expensive compute, fan-out, regeneration |
| Discovery and processor (`scripts/job-discovery`, `scripts/job-processor`) | supply pipeline |

## What matters now

1. **Data engine reliability.** Scale verified ATS coverage from ~200 to 500, then 1,000+ active hiring companies (`ROADMAP.md`, Phase 1).
2. **One freshness contract.** Public counts, feeds, shards, sitemap data, and landing stats must agree, or the trust surface is lying. This is the first non-negotiable rule in `docs/plans/README.md`.
3. **Close the documented gaps before any re-platforming.** `docs/ARCHITECTURE-TRUTH.md` §13 lists six, starting with the commented-out publish→R2 refresh.

## Source order

When two sources disagree, the earlier row wins. Do not average them.

| # | Owns | Source |
|---|---|---|
| 1 | Verified structural facts about this repo | `docs/ARCHITECTURE-TRUTH.md` |
| 2 | Product direction, sequencing, open work | `ROADMAP.md`, `docs/plans/` |
| 3 | Database shape | `packages/database/prisma/schema.prisma` |
| 4 | Shared request and response types | `packages/types/src/index.ts` |
| 5 | Frontend to backend contract | `packages/api-client/src/` |
| 6 | Per-app conventions | `AGENTS.md`, `apps/*/AGENTS.md`, `scripts/*/AGENTS.md` |
| 7 | Skill-level how-to | `.agents/skills/*/SKILL.md` |

Row 1 outranks row 6 on purpose. `docs/ARCHITECTURE-TRUTH.md` states a rule of
evidence ("every structural claim cites `file:line`") that the guides do not, and
it is the file that was written to replace guesses about this repo.

## Navigation

| Room | Question it answers | Lives at |
|---|---|---|
| Map | where am I, what matters | this file |
| Truth | what is actually true in the repo | `docs/ARCHITECTURE-TRUTH.md` |
| Direction | what we are building, in what order | `ROADMAP.md`, `docs/plans/` |
| Decisions | what we decided and why | [`decisions/`](./decisions/README.md) |
| People | who owns a call, what needs approval | [`people/`](./people/README.md) |
| Projects | current work and status | [`projects/`](./projects/README.md) |
| Policies | rules that apply every time | [`policies/`](./policies/README.md) |
| Skills | proven ways to perform a task | [`skills/`](./skills/README.md) |
| Workers | repeatable jobs an agent can run | [`workers/`](./workers/README.md) |
| Learnings | reviewed corrections worth keeping | [`learnings.md`](./learnings.md) |

## Rules

- Use the newest approved information; on conflict, follow the source order above.
- If the answer is missing, say what you could not find. Never turn a guess into company knowledge.
- Cite `file:line` for any structural claim.
- Put each fact in exactly one place. If `AGENTS.md` already states a rule, link to it instead of restating it.
- Frontends never import Prisma or `packages/database`; they call the backend through `packages/api-client`.
- Frontends never import from `apps/api`.
- `packages/database/prisma/schema.prisma`, `packages/types/src/index.ts`, and `packages/api-client/src/` are high-risk: changing them touches every app.
- Never commit `.env`, service-account JSON, token dumps, or credential files.
- Validation is `pnpm typecheck` and `pnpm build` from the repo root; `pnpm test` where tests exist.

## How knowledge gets here

Nothing enters this folder straight from a chat. It goes through the loop in
[`learnings.md`](./learnings.md):

```
work -> correction -> route -> review -> share -> better future work
```

A correction is routed by kind: a missing fact to the file that owns it, a new
strategic choice to a decision record, a repeated preference to a policy, a
proven technique to a skill, a repeatable sequence to a worker, a dangerous
action to a mechanical gate.

## What this folder is not

It is not a second copy of `AGENTS.md`, `docs/`, or `.agents/skills/`. Those
already answer policies, architecture, and technique. This folder is the index
over them plus the two things the repo was missing: a decision record layer and a
reviewed learning layer.
