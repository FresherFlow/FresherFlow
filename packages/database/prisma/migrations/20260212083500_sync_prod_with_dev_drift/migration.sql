-- Manually captured drift to sync Prod with Dev state
-- Includes: Enum updates, AlertDelivery readAt column, and missing Opportunity indexes

-- 1. Enum Updates (Safe addition of new values)
ALTER TYPE "AlertChannel" ADD VALUE IF NOT EXISTS 'APP';
ALTER TYPE "AlertKind" ADD VALUE IF NOT EXISTS 'HIGHLIGHT';
ALTER TYPE "AlertKind" ADD VALUE IF NOT EXISTS 'APP_UPDATE';

-- 2. AlertDelivery Enhancements
-- Note: COLUMN IF NOT EXISTS is not standard Postgres < 9.6, but we'll use safe ALTER if handled by deploy
ALTER TABLE "AlertDelivery" ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "AlertDelivery_readAt_idx" ON "AlertDelivery"("readAt");

-- 3. Opportunity Performance Indexes (Missing in Prod)
CREATE INDEX IF NOT EXISTS "Opportunity_allowedPassoutYears_idx" ON "Opportunity"("allowedPassoutYears");
CREATE INDEX IF NOT EXISTS "Opportunity_allowedDegrees_idx" ON "Opportunity"("allowedDegrees");
CREATE INDEX IF NOT EXISTS "Opportunity_allowedCourses_idx" ON "Opportunity"("allowedCourses");
CREATE INDEX IF NOT EXISTS "Opportunity_requiredSkills_idx" ON "Opportunity"("requiredSkills");

-- Composite index for the main job feed (Performance Optimization)
CREATE INDEX IF NOT EXISTS "Opportunity_status_deletedAt_type_postedAt_idx" ON "Opportunity"("status", "deletedAt", "type", "postedAt" DESC);
