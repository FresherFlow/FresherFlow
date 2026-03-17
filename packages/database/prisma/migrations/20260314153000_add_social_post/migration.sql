-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('X', 'LINKEDIN', 'FACEBOOK');

-- CreateEnum
CREATE TYPE "SocialPostStatus" AS ENUM ('PENDING', 'PUBLISHED', 'FAILED');

-- CreateTable
CREATE TABLE "SocialPost" (
    "id" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "status" "SocialPostStatus" NOT NULL DEFAULT 'PENDING',
    "externalPostId" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "errorMessage" TEXT,
    "payload" JSONB,
    "publishedAt" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SocialPost_dedupeKey_key" ON "SocialPost"("dedupeKey");

-- CreateIndex
CREATE INDEX "SocialPost_opportunityId_platform_idx" ON "SocialPost"("opportunityId", "platform");

-- CreateIndex
CREATE INDEX "SocialPost_status_platform_idx" ON "SocialPost"("status", "platform");

-- CreateIndex
CREATE INDEX "SocialPost_createdAt_idx" ON "SocialPost"("createdAt");

-- AddForeignKey
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
