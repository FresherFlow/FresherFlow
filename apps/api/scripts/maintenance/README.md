# Staging Maintenance Scripts

These scripts operate on the staging ingestion database (`STAGING_DATABASE_URL`) and are safe by default (dry run).

## Commands

- Rejection audit:
  - `npm run maintenance:staging:rejected --workspace=apps/api`

- Deduplicate raw opportunities:
  - Dry run: `npm run maintenance:staging:dedupe:dry --workspace=apps/api`
  - Apply: `npx ts-node scripts/maintenance/dedupeRawOpportunities.ts --apply`

- Cleanup ingestion sources:
  - Dry run: `npm run maintenance:staging:sources:dry --workspace=apps/api`
  - Apply: `npx ts-node scripts/maintenance/cleanupIngestionSources.ts --mode=invalid --apply`
  - Modes: `invalid`, `failed`, `empty`
  - Optional allowlist: `--allowlist=atlassian,netflix,freshworks`
