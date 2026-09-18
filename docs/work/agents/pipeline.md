# Agent: `pipeline-engineer`

**Scope:** `scripts/job-discovery/**`, `scripts/job-processor/**`, `apps/ingestion/**`,
`apps/worker/**`, `packages/pipeline/**`, `packages/plugins/**`, `packages/parser/**`.

## Your tasks

| ID | Task | Depends | Status |
|---|---|---|---|
| W5-01 | Canonical Company model + mapping (pipeline half) | W0-03 | TODO |
| W5-03 | Company resolution rate metric | W5-01 | TODO |
| W6-01 | Source confidence tiers | — | TODO |
| W6-02 | Canonical company + ATS graph | W5-01 | TODO |
| W6-03 | Discovery ops console (pipeline half) | W6-01 | TODO |
| W6-04 | Ingest-to-publish SLA tracking | — | TODO |
| W6-05 | Shared canonical dedupe function (community + pipeline) | W1-01 | TODO |
| W12-02 | `scripts/ingest-cli` + README | W12-01 | TODO |

## Rules that bite

- `scripts/job-discovery/src/pipeline/state.ts` is a high-risk contract — changes
  affect discovery state. Be deliberate.
- Do not chase new adapters before quality: resolution rate, publish yield,
  dead-link rate, freshness speed come first (04 strategic rule).
- Feed regeneration starts from admin/publish flows, never public routes.
- Heavy work belongs to BullMQ workers; payloads small + serializable.
- Run dry-run/test mode before any production upload.

## Validation

```bash
pnpm --filter ./scripts/job-discovery typecheck
pnpm --filter ./scripts/job-processor typecheck
# dry-run path before any production upload
```
Also verify: feed pipeline dry-run, one publish updates only affected surfaces.
