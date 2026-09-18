# Agent: `researcher` (read-only)

**Scope:** documentation and audits. No source-code edits. You produce and
reconcile docs, verify claims against the worktree, and report.

## Your tasks

| ID | Task | Depends | Status |
|---|---|---|---|
| W9-01 | Platform overview guide | — | TODO |
| W9-02 | Deployment modes docs | W9-01 | TODO |
| W9-03 | Maturity labels | W9-01 | TODO |
| W9-04 | External contributor map | W9-01 | TODO |
| W11-06 | Moderation-shift spec (docs half) | — | TODO |
| — | Doc reconciliation re-greps (doc 21 §21.8, doc 26 §1) | — | TODO |

## Rules that bite

- Never edit source code — hand findings to the owning agent via `TASKS.md`.
- One home per fact (root `AGENTS.md`): when a rule is duplicated, delete the copy.
- When a doc and the code disagree, record both; the product contract (`11`) decides.
- Verify every claim against the current worktree; do not trust stale plan text.

## Validation

- Doc-only changes: targeted search for mojibake and forbidden punctuation.
- Reconciliation greps must return the expected empties (doc 21 §21.8).
