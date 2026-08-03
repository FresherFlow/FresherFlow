-- CreateEnum if not exists
DO $$ BEGIN
    CREATE TYPE "ProfileVisibility" AS ENUM ('PUBLIC', 'UNLISTED', 'PRIVATE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable Profile safely
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "collegeId" TEXT;
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "collegeName" TEXT;
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "collegeState" TEXT;
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "headline" TEXT;
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "about" TEXT;
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "githubUrl" TEXT;
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "linkedinUrl" TEXT;
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "portfolioUrl" TEXT;
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "githubPinnedRepos" JSONB;
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "openToRecruiters" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "profilePublic" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "visibility" "ProfileVisibility" NOT NULL DEFAULT 'PUBLIC';
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "profilePublishedAt" TIMESTAMP(3);

-- AlterTable Opportunity safely
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "structuredLocations" JSONB;
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "experienceMin" DOUBLE PRECISION;
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "experienceMax" DOUBLE PRECISION;
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "companyId" TEXT;

-- CreateIndex safely
CREATE INDEX IF NOT EXISTS "Opportunity_companyId_idx" ON "Opportunity"("companyId");
