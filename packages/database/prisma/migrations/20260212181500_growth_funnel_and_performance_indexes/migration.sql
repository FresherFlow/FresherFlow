-- 1. Growth Funnel Event Enum Additions
ALTER TYPE "GrowthFunnelEvent" ADD VALUE IF NOT EXISTS 'SAVE_JOB';
ALTER TYPE "GrowthFunnelEvent" ADD VALUE IF NOT EXISTS 'APPLY_CLICK';
ALTER TYPE "GrowthFunnelEvent" ADD VALUE IF NOT EXISTS 'SHARE_JOB';
ALTER TYPE "GrowthFunnelEvent" ADD VALUE IF NOT EXISTS 'SIGNUP_VIEW';

-- 2. Performance Indexes for Opportunity model
-- Drop existing non-GIN indexes for array fields to replace with GIN
DROP INDEX IF EXISTS "Opportunity_allowedPassoutYears_idx";
DROP INDEX IF EXISTS "Opportunity_allowedDegrees_idx";
DROP INDEX IF EXISTS "Opportunity_allowedCourses_idx";
DROP INDEX IF EXISTS "Opportunity_requiredSkills_idx";
DROP INDEX IF EXISTS "Opportunity_locations_idx";

-- Create optimized GIN indexes for array filtering
CREATE INDEX IF NOT EXISTS "Opportunity_allowedPassoutYears_idx" ON "Opportunity" USING GIN ("allowedPassoutYears");
CREATE INDEX IF NOT EXISTS "Opportunity_allowedDegrees_idx" ON "Opportunity" USING GIN ("allowedDegrees");
CREATE INDEX IF NOT EXISTS "Opportunity_allowedCourses_idx" ON "Opportunity" USING GIN ("allowedCourses");
CREATE INDEX IF NOT EXISTS "Opportunity_locations_idx" ON "Opportunity" USING GIN ("locations");
CREATE INDEX IF NOT EXISTS "Opportunity_requiredSkills_idx" ON "Opportunity" USING GIN ("requiredSkills");

-- Add scalar indexes for common filters
CREATE INDEX IF NOT EXISTS "Opportunity_salaryMin_salaryMax_idx" ON "Opportunity" ("salaryMin", "salaryMax");
CREATE INDEX IF NOT EXISTS "Opportunity_company_idx" ON "Opportunity" ("company");
CREATE INDEX IF NOT EXISTS "Opportunity_slug_idx" ON "Opportunity" ("slug");

-- 3. Advanced Text Search Optimization
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "Opportunity_title_company_trgm_idx" ON "Opportunity" USING GIN ("title" gin_trgm_ops, "company" gin_trgm_ops);
