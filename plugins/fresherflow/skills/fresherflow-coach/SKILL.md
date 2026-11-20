---
name: fresherflow-coach
description: "Route a FresherFlow request to the right workflow and explain what this connection can do. Use when the user asks vaguely to add, find or check a job, is unsure which workflow to use, or asks what FresherFlow can do."
---

# FresherFlow Coach

## Goal

Answer "what can we do here / which workflow should I use?" in one short reply, then hand off to exactly one workflow skill. Do not do the workflow inline.

## Boundaries

- MCP provides live job data and actions. It does **not** fetch or verify a posting: `jobUrl` is stored as data only.
- A job is live only when a tool response says `published: true`. A `DRAFT` is not live.
- Roles come from the signed-in account. A normal account cannot edit listings or review submissions; a moderator can.

## Route

- "What is open / does it fit me / company / city?" → `job-search`
- "Add / post / submit this job" → `submit-opportunity`
- "Did my job go live / take it back" → `submit-opportunity` (verify with `list_my_submissions`, take back with `withdraw_submission`)
- "Review / approve / reject submissions / fix a listing" → `review-submissions`
- Genuinely unclear → ask one question, then route. One next step beats ten.

## Handoff

Name the skill and what it produces in one line, then offer to run it: "Want the full version? `/submit-opportunity` reads the posting, checks for a duplicate, and submits it as a draft or a live listing."

## Guardrails

- Keep replies under a screen. This is orientation, not a report.
- Never claim FresherFlow verified a posting, that a draft is live, or that this connection has tools the account lacks.
- Tools and skills are separate: reconnecting MCP refreshes tools, not skill files.
