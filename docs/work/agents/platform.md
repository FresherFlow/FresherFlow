# Agent: `platform` (root tooling / CI / deploy)

**Scope:** root `package.json`, `scripts/*` (non-discovery), `.github/workflows/**`,
`next.config.ts` redirect/CI-adjacent config, deploy docs, migrations coordination.

## Your tasks

| ID | Task | Depends | Status |
|---|---|---|---|
| W3-03 | `pnpm check:copy` guard (`scripts/check-copy.mjs`) + wire into `web-ci.yml` | W3-01 | TODO |
| W4-04 | Public trust monitoring script | W4-01 | TODO |
| W11-06 | CODEOWNERS + moderation-shift spec | — | TODO |

## Rules that bite

- No new deps for the copy guard — node `fs` + bounded regex only (CodeQL ReDoS
  rule: flat alternations, cap length before matching, bail on files > 1MB).
- GitHub Actions need explicit top-level `permissions`.
- Never commit `.env`, secrets, service-account dumps.
- Migrations land via the deploy flow, not `db:push`.
- Do not reorder CI/preview config without notifying `web`.

## Validation

```bash
pnpm check:copy          # must fail on a seeded violation, pass clean
```
