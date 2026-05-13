-- CreateEnum
CREATE TYPE "UserTrustLevel" AS ENUM ('NEW', 'VERIFIED', 'CONTRIBUTOR', 'MODERATOR', 'BANNED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "FeedbackReason" ADD VALUE 'SPAM';
ALTER TYPE "FeedbackReason" ADD VALUE 'OTHER';

-- DropIndex
DROP INDEX "Opportunity_status_deletedAt_type_postedAt_idx";

-- DropIndex
DROP INDEX "Opportunity_status_idx";

-- DropIndex
DROP INDEX "Opportunity_title_company_trgm_idx";

-- DropIndex
DROP INDEX "Opportunity_type_idx";

-- AlterTable
ALTER TABLE "AdminDeliveryControl" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "AlertDispatchLog" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "GovernmentJobDetails" ADD COLUMN     "applicationFeeDetails" JSONB,
ADD COLUMN     "applicationModes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "eligibilityDetails" JSONB,
ADD COLUMN     "examDates" JSONB,
ADD COLUMN     "recruitingBody" TEXT,
ADD COLUMN     "requiredDocumentDetails" JSONB,
ADD COLUMN     "vacancies" JSONB,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ListingFeedback" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "Opportunity" ADD COLUMN     "clicksCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "savesCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sharesCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "trendingScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0;

-- AlterTable
ALTER TABLE "RawOpportunity" ADD COLUMN     "createdByUserId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "trustLevel" "UserTrustLevel" NOT NULL DEFAULT 'NEW',
ADD COLUMN     "trustScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0;

-- CreateTable
CREATE TABLE "DomainReputation" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "trustScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DomainReputation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DomainReputation_domain_key" ON "DomainReputation"("domain");

-- CreateIndex
CREATE INDEX "DomainReputation_domain_idx" ON "DomainReputation"("domain");

-- CreateIndex
CREATE INDEX "DomainReputation_trustScore_idx" ON "DomainReputation"("trustScore");

-- CreateIndex
CREATE INDEX "GrowthEvent_source_createdAt_idx" ON "GrowthEvent"("source", "createdAt");

-- CreateIndex
CREATE INDEX "Opportunity_status_deletedAt_type_postedAt_idx" ON "Opportunity"("status", "deletedAt", "type", "postedAt");

-- CreateIndex
CREATE INDEX "Opportunity_status_postedAt_idx" ON "Opportunity"("status", "postedAt");

-- CreateIndex
CREATE INDEX "Opportunity_trendingScore_idx" ON "Opportunity"("trendingScore");

-- CreateIndex
CREATE INDEX "Opportunity_sharesCount_idx" ON "Opportunity"("sharesCount");

-- CreateIndex
CREATE INDEX "RawOpportunity_createdByUserId_idx" ON "RawOpportunity"("createdByUserId");

-- AddForeignKey
ALTER TABLE "RawOpportunity" ADD CONSTRAINT "RawOpportunity_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
