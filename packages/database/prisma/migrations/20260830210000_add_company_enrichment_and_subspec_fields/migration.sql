-- AlterTable: Add company enrichment fields to Opportunity
ALTER TABLE "Opportunity"
ADD COLUMN IF NOT EXISTS "companyStage" TEXT,
ADD COLUMN IF NOT EXISTS "companySize" TEXT,
ADD COLUMN IF NOT EXISTS "companyIndustry" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "companyTopics" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex: GIN indexes for companyIndustry and companyTopics
CREATE INDEX IF NOT EXISTS "Opportunity_companyIndustry_idx" ON "Opportunity" USING GIN ("companyIndustry");
CREATE INDEX IF NOT EXISTS "Opportunity_companyTopics_idx" ON "Opportunity" USING GIN ("companyTopics");

-- AlterTable: Add sub-spec fields to WalkInDetails
ALTER TABLE "WalkInDetails"
ADD COLUMN IF NOT EXISTS "expiryDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "landmark" TEXT,
ADD COLUMN IF NOT EXISTS "transitInfo" TEXT,
ADD COLUMN IF NOT EXISTS "selectionProcess" TEXT;

-- AlterTable: Add sub-spec fields to GovernmentJobDetails
ALTER TABLE "GovernmentJobDetails"
ADD COLUMN IF NOT EXISTS "payScale" TEXT,
ADD COLUMN IF NOT EXISTS "vacancies" JSONB;
