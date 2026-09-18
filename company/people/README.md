# People

Who owns a call, and what cannot be done without approval.

The point of this room is to stop an agent guessing at authority. It answers one
question: for this kind of change, who decides, and does it need a human first.

## Owners

**Unfilled.** This table needs a human to complete it. Nothing here is inferred,
because a wrong owner is worse than a blank one.

| Area | Owner | Decides alone | Needs a second opinion |
|---|---|---|---|
| Repository and schema | | | |
| Public web and SEO | | | |
| API and queues | | | |
| Mobile and admin mobile | | | |
| Discovery and processor pipelines | | | |
| Content and distribution | | | |

## Approval boundaries

These are already stated by existing sources, so they are recorded here by
reference rather than restated. Follow the link for the authoritative wording.

| Action | Boundary | Source |
|---|---|---|
| Prisma migrations and `db:push` | Only when requested, never as a side effect of another change | `AGENTS.md` validation table |
| Feed regeneration | Starts from admin or publish flows, never from public frontend routes | `AGENTS.md`, app boundaries |
| Production feed upload | Dry-run or test mode first | `AGENTS.md` validation table |
| Cookie-auth mutations | Origin or CSRF validation required | `AGENTS.md`, security rules |
| Committing secrets | Never, any environment | `AGENTS.md`, environment rules |
| Marking a decision `accepted` | Human only; an agent may not accept its own proposal | [`../decisions/README.md`](../decisions/README.md) |

## Adding an owner

Record the smallest true claim. "Owns the schema decision, may merge migrations
alone, needs review before a destructive migration" is useful. A name alone is
not, and a guessed name is harmful.
