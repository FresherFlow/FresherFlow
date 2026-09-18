# Decisions

What we decided and why. One file per decision, numbered, never rewritten.

The repo already records *what is true* (`docs/ARCHITECTURE-TRUTH.md`) and *what
we are building* (`ROADMAP.md`, `docs/plans/`). What it had no home for is the
choice between two defensible options and the reason the loser lost. That lives
here, so the next agent does not relitigate a settled question or silently
reverse it.

## When a decision record is required

Per the routing table in [`../learnings.md`](../learnings.md), a **new strategic
choice** goes here. In practice that means any of:

- A package, app, or layer is created, merged, or deleted.
- A source-of-truth boundary moves, for example which system owns a piece of state.
- A guide is overruled by reality, or a guide is changed to match reality.
- Something is deliberately left undone with a known cost, and we want that on the record.

Routine fixes are not decisions. If there is only one defensible answer, just fix
it and record it as a learning.

## Lifecycle

| Status | Meaning |
|---|---|
| `proposed` | Written up, not yet approved. Do not act on it as settled. |
| `accepted` | Approved. Guides, code, and other docs must agree with it. |
| `superseded` | Replaced by a later record. Keep the file, add a pointer to the replacement. |
| `rejected` | Considered and declined. Keep it so it is not re-proposed blind. |

Accepted records are frozen: correct them by superseding, not by editing history.

## Human review is required

Any record moving from `proposed` to `accepted` needs a human decision. An agent
may write the proposal, gather the evidence, and recommend an option; it may not
mark its own proposal accepted.

## Naming

```
NNNN-short-imperative-title.md
```

Four-digit sequence, allocated in order (`0001`, `0002`, …). Start from
[`TEMPLATE.md`](./TEMPLATE.md).

## Index

| # | Decision | Status |
|---|---|---|
| [0001](./0001-shared-rules-location.md) | Where shared business rules live | proposed |
| [0002](./0002-identity-community-exchange-not-scraper-or-board.md) | FresherFlow is a community exchange, not a scraper or a job board | proposed |
