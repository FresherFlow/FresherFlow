---
name: review-submissions
description: "Review community submissions in FresherFlow: read the queue, then approve, reject, or fix and publish a pending listing. Use when a moderator asks what needs review, asks to approve or reject a specific submission, or asks to correct a draft before publishing. Requires a moderator account."
---

# Review submissions

## Goal

Decide pending submissions accurately and take exactly one action per submission. An approval makes a listing live and notifies the submitter; a rejection is visible to them in their history. Both are consequential.

## Required inputs

- A moderator account with `opportunity.review` / `opportunity.publish`.
- An explicit instruction for the specific submission, except when the user asks only to see the queue.

## MCP tools used

- `review_queue` — pending submissions with the submitter and linked listing. Returns the `submissionId` you need, **not** a listing id.
- `get_listing` — read the linked listing before an edit.
- `approve_submission` — publish a pending submission.
- `reject_submission` — reject with a reason.
- `update_listing` — full replace, only when the user explicitly wants to fix details first.

## Workflow

1. Call `review_queue`. If the response says the permission is missing, the account is not a moderator — stop and say so; do not offer to approve.
2. Read the row: title, company, linked listing and submitter. Use the submission id from this tool in the decision tools.
3. Choose **one** path:
   - Complete and valid → `approve_submission`
   - Not a fresher role, duplicate, expired or wrong details → `reject_submission` with a concrete reason the contributor can act on
   - Needs a small fix the user explicitly asked for → `get_listing`, then `update_listing` with the **complete** payload and `status: PUBLISHED`
4. Read the response. A listing is live only when it says `published: true`.

## Output format

- One line per submission decided: title — action — why — whether it is live.
- Then one next step. Never paste the full listing into chat.

## Guardrails

- Never approve or reject on your own judgement — only on the user's explicit instruction for that specific submission.
- Never sweep several rows in one move unless the user asked for it.
- Never use two paths for the same submission. Approval and `update_listing` are alternatives, not steps in a sequence.
- `reject_submission` needs a real reason ("wrong details", "expired posting", "duplicate", "not a fresher role") — not just "rejected".
- Publishing alerts real people and rebuilds public feeds. Say when you did it.
- `update_listing` is a full replace: call `get_listing` first, and send every field you want kept.
