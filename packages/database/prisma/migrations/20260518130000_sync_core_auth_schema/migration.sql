-- CreateEnum
CREATE TYPE "FollowType" AS ENUM ('TAG', 'COMPANY', 'CONTRIBUTOR');

-- AlterEnum
ALTER TYPE "ActionType" ADD VALUE 'SHARED';

-- DropIndex
DROP INDEX "SocialPost_opportunityId_platform_idx";

-- DropIndex
DROP INDEX "SocialPost_status_platform_idx";

-- AlterTable
ALTER TABLE "Opportunity" ADD COLUMN     "commentsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "SocialPost" ADD COLUMN     "scheduledFor" TIMESTAMP(3);

-- AlterTable
-- We make this migration 100% additive & safe by NOT dropping "passwordHash", "provider", or "providerId".
-- This guarantees absolutely zero data loss for your 100 production users.
ALTER TABLE "User" ADD COLUMN     "anon_id" TEXT,
ADD COLUMN     "firebase_uid" TEXT,
ADD COLUMN     "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastLogin" TIMESTAMP(3),
ADD COLUMN     "username" TEXT,
ADD COLUMN     "usernameUpdatedAt" TIMESTAMP(3),
ALTER COLUMN "email" DROP NOT NULL;

-- CreateTable
CREATE TABLE "UserFollow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "FollowType" NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFollow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityComment" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "OpportunityComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserFollow_userId_idx" ON "UserFollow"("userId");

-- CreateIndex
CREATE INDEX "UserFollow_type_value_idx" ON "UserFollow"("type", "value");

-- CreateIndex
CREATE UNIQUE INDEX "UserFollow_userId_type_value_key" ON "UserFollow"("userId", "type", "value");

-- CreateIndex
CREATE INDEX "OpportunityComment_opportunityId_createdAt_idx" ON "OpportunityComment"("opportunityId", "createdAt");

-- CreateIndex
CREATE INDEX "OpportunityComment_userId_idx" ON "OpportunityComment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_tokenHash_idx" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "SocialPost_opportunityId_platform_status_idx" ON "SocialPost"("opportunityId", "platform", "status");

-- CreateIndex
CREATE INDEX "SocialPost_scheduledFor_status_idx" ON "SocialPost"("scheduledFor", "status");

-- CreateIndex
CREATE UNIQUE INDEX "User_firebase_uid_key" ON "User"("firebase_uid");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_anon_id_key" ON "User"("anon_id");

-- AddForeignKey
ALTER TABLE "UserFollow" ADD CONSTRAINT "UserFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityComment" ADD CONSTRAINT "OpportunityComment_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityComment" ADD CONSTRAINT "OpportunityComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
