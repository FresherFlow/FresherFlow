# Projects

Current work and status.

The repo already has a planning pack, and this room does not replace it. Use this
file to route, not to duplicate:

| Question | Go to |
|---|---|
| What are we building, in what order, and what is live today | `ROADMAP.md` |
| The full planning pack, its folder map, and its non-negotiable rules | `docs/plans/README.md` |
| Detailed plans by area | the workstream folders under `docs/plans/` (`01-product-foundation` through `09-messaging-and-copy`) |
| Finished work | `docs/plans/completed/` |
| What is structurally true right now | `docs/ARCHITECTURE-TRUTH.md` |

## Project entries

Create a file here only when a piece of work outlives a plan document and needs a
status that people will check. Keep it short enough to stay true.

```md
# <project name>

- Status: not started | in progress | blocked | done
- Owner: <see ../people/README.md>
- Plan: <link into docs/plans or ROADMAP.md>
- Last verified: YYYY-MM-DD

## Now

What is being worked on this week, and what it will be when it is done.

## Blocked on

Anything waiting on a decision or an external system. Link the decision
record in ../decisions/ when that is the blocker.

## Acceptance check

The command or observation that proves it is done. A project with no acceptance
check cannot be marked done.
```

## Rule

Status that nobody updates is worse than no status. If an entry has not been
verified in a month, either re-verify it or delete it.
