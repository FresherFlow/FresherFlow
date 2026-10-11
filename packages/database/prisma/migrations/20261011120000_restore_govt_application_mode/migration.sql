-- Repair (2026-10-11): restore GovernmentJobDetails."applicationMode".
--
-- Why this exists
--   schema.prisma:1100 declares `applicationMode String?`, and the API both
--   selects it (routes/public/opportunities/_helpers.ts:219) and writes it
--   (routes/admin/governmentJobs.ts:43,71).
--   But the column's history is:
--     20260327120000  CREATE  ... "applicationMode" TEXT
--     20260605190000  DROP    ... "applicationMode", "applicationModes"
--   Nothing ever recreates it, so a database migrated from the folder ends up
--   with a Prisma client that selects a column the database does not have.
--   `prisma migrate diff --from-migrations prisma/migrations
--    --to-schema prisma/schema.prisma` reported exactly this column as the
--   only drift in the whole schema, which is the check this file closes.
--
-- Idempotent
--   ADD COLUMN IF NOT EXISTS is required: environments that never applied the
--   20260605 drop (or that are replayed after a partial failure) already have
--   the column, and must not abort.
--
-- Note
--   "applicationModes" (plural, TEXT[]) is intentionally NOT restored: it is
--   absent from schema.prisma, so the 20260605 drop is correct for it.

ALTER TABLE "GovernmentJobDetails"
  ADD COLUMN IF NOT EXISTS "applicationMode" TEXT;
