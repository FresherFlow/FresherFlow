# Policies

Rules that apply every time, without being asked.

**Policy text does not live in this file.** The authoritative rules already exist
in the guides, and a second copy would drift within a week. This room is the index
so an agent can find the rule that applies without reading every guide.

## Where the rules are

| Policy area | Source |
|---|---|
| Core principles, project shape, source of truth | `AGENTS.md` |
| App boundaries, environment rules | `AGENTS.md` |
| Security and CodeQL rules | `AGENTS.md`, and `.agents/skills/security-review/` |
| ISR and caching policy | `AGENTS.md` |
| Validation requirements per change type | `AGENTS.md` |
| Dirty worktree policy | `AGENTS.md` |
| Design system per app | `apps/web/DESIGN_SYSTEM.md`, `apps/mobile/DESIGN_SYSTEM.md`, `apps/admin-mobile/DESIGN_SYSTEM.md` |
| Web conventions | `apps/web/AGENTS.md` |
| API conventions | `apps/api/AGENTS.md` |
| Mobile conventions | `apps/mobile/AGENTS.md` |
| Admin mobile conventions | `apps/admin-mobile/AGENTS.md` |
| Discovery and processor conventions | `scripts/job-discovery/AGENTS.md`, `scripts/job-processor/AGENTS.md` |
| Automated gates | `.github/workflows/codeql.yml`, `.github/workflows/web-ci.yml` |

## Adding a policy

A repeated preference becomes a policy. That means the same correction has
arrived more than once, and answering it in a prompt is no longer enough.

1. State it in the guide that already owns that area, not here.
2. Add a row to the table above if the area is not yet indexed.
3. Record it in [`../learnings.md`](../learnings.md) so the reason survives.
4. If the rule is dangerous to break, add a mechanical gate rather than more
   prompt text. A rule enforced only by prose will eventually be broken by a
   distracted agent.

## Known stale rule

Root `AGENTS.md` and seven skills currently state that business rules live in
`packages/domain`, which does not exist. The app guides no longer restate it;
they link to the root file, per "One home per fact". Until
[`../decisions/0001-shared-rules-location.md`](../decisions/0001-shared-rules-location.md)
is accepted and the guides are corrected, treat any rule that names
`packages/domain` or `packages/redis` as unenforceable.
