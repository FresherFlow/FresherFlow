-- CreateEnum
CREATE TYPE "ProfileVisibility" AS ENUM ('PUBLIC', 'UNLISTED', 'PRIVATE');

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "collegeId" TEXT;
ALTER TABLE "Profile" ADD COLUMN "collegeName" TEXT;
ALTER TABLE "Profile" ADD COLUMN "collegeState" TEXT;
ALTER TABLE "Profile" ADD COLUMN "headline" TEXT;
ALTER TABLE "Profile" ADD COLUMN "about" TEXT;
ALTER TABLE "Profile" ADD COLUMN "githubUrl" TEXT;
ALTER TABLE "Profile" ADD COLUMN "linkedinUrl" TEXT;
ALTER TABLE "Profile" ADD COLUMN "portfolioUrl" TEXT;
ALTER TABLE "Profile" ADD COLUMN "avatarUrl" TEXT;
ALTER TABLE "Profile" ADD COLUMN "githubPinnedRepos" JSONB;
ALTER TABLE "Profile" ADD COLUMN "openToRecruiters" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Profile" ADD COLUMN "profilePublic" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Profile" ADD COLUMN "visibility" "ProfileVisibility" NOT NULL DEFAULT 'PUBLIC';
ALTER TABLE "Profile" ADD COLUMN "profilePublishedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Opportunity" ADD COLUMN "structuredLocations" JSONB;
ALTER TABLE "Opportunity" ADD COLUMN "experienceMin" DOUBLE PRECISION;
ALTER TABLE "Opportunity" ADD COLUMN "experienceMax" DOUBLE PRECISION;
ALTER TABLE "Opportunity" ADD COLUMN "companyId" TEXT;

-- CreateIndex
CREATE INDEX "Opportunity_companyId_idx" ON "Opportunity"("companyId");
