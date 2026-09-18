# Skills

Proven ways to perform a task.

The skills themselves live in `.agents/skills/<name>/SKILL.md` (83 installed as
of 2026-09-11). This room is the index and the rule set, not a second copy.

## What is already covered

| Need | Skill |
|---|---|
| Repo-wide engineering procedure | `project-engineering`, `fresherflow-principal-engineer`, `excellent-agent` |
| Web work | `fresherflow-web-context`, `vercel-react-best-practices`, `web-design-guidelines` |
| API work | `fresherflow-api-context`, `api-development`, `new-endpoint`, `api-design-principles` |
| Data and schema | `schema-change`, `prisma-client-api`, `prisma-cli`, `prisma-database-setup` |
| Mobile and admin mobile | `mobile-screen`, `vercel-react-native-skills`, `expo-*` |
| Security | `security-review`, `security-best-practices` |
| Verification | `testing`, `debugging` |
| UI and motion | `improve-uiux`, `improve-animations`, `apple-design`, `emil-design-eng` |
| Shared packages | `package-development`, `architecture` |
| Copy and docs | `fresherflow-copy`, `writing-guidelines` |
| Deployment | `deploy-to-vercel`, `vercel-cli-with-tokens`, `vercel-optimize` |

## Adding a skill

A skill is for a **proven technique**: a method that has already worked more than
once and would otherwise be re-derived. A one-off answer belongs in a decision
record or a learning instead.

1. Search first, so an existing skill is extended rather than duplicated.
2. Write `.agents/skills/<name>/SKILL.md` with frontmatter (`name`, `description`) and the procedure.
3. Keep the `description` trigger-shaped, because that is what decides when the skill loads.
4. Record what it replaced in [`../learnings.md`](../learnings.md).

Community skills can be installed with `npx skills add <owner/repo> --skill <name>
--yes`. They are not vetted, so confirm before installing one into the repo.

## Known stale skill content

Seven skills repeat the claim that business rules live in `packages/domain`, which
does not exist:

`.agents/skills/architecture/SKILL.md:41,53,54`,
`.agents/skills/api-development/SKILL.md:16`,
`.agents/skills/package-development/SKILL.md:16`,
`.agents/skills/new-endpoint/SKILL.md:67`,
`.agents/skills/project-engineering/SKILL.md:14,88,148,157,210`,
`.agents/skills/debugging/SKILL.md:24`,
`.agents/skills/fresherflow-api-context/SKILL.md:42`.

These load automatically and teach the wrong boundary. Tracked as finding 1 in
[`../learnings.md`](../learnings.md) and
[`../decisions/0001-shared-rules-location.md`](../decisions/0001-shared-rules-location.md).
