-- CreateEnum
CREATE TYPE "PlatformEventType" AS ENUM ('VIEW_JOB', 'CLICK_APPLY', 'SHARE_JOB', 'SAVE_JOB', 'REFERRAL_HIT', 'REFERRAL_CLICK', 'APP_INIT', 'AUTH_STEP');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.
ALTER TYPE "ActionType" ADD VALUE 'OA';
ALTER TYPE "ActionType" ADD VALUE 'REJECTED';
ALTER TYPE "ActionType" ADD VALUE 'REPORTED';

-- AlterEnum
ALTER TYPE "GrowthFunnelEvent" ADD VALUE 'APP_INIT';

-- CreateTable
CREATE TABLE "PlatformEvent" (
    "id" TEXT NOT NULL,
    "type" "PlatformEventType" NOT NULL,
    "opportunityId" TEXT,
    "userId" TEXT,
    "sessionId" TEXT,
    "source" TEXT DEFAULT 'unknown',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformEvent_pkey" PRIMARY KEY ("id")
);

-- Backfill prior tracking tables before dropping them.
INSERT INTO "PlatformEvent" ("id", "type", "opportunityId", "userId", "sessionId", "source", "metadata", "createdAt")
SELECT
    'oc_' || "id",
    CASE WHEN "isInternal" THEN 'VIEW_JOB'::"PlatformEventType" ELSE 'CLICK_APPLY'::"PlatformEventType" END,
    "opportunityId",
    "userId",
    "sessionId",
    "source",
    jsonb_strip_nulls(jsonb_build_object(
        'targetUrl', "targetUrl",
        'referrer', "referrer",
        'userAgent', "userAgent",
        'ipHash', "ipHash",
        'isInternal', "isInternal",
        'legacyTable', 'OpportunityClick'
    )),
    "createdAt"
FROM "OpportunityClick";

INSERT INTO "PlatformEvent" ("id", "type", "userId", "sessionId", "source", "metadata", "createdAt")
SELECT
    'rv_' || "id",
    'REFERRAL_HIT'::"PlatformEventType",
    "visitorUserId",
    "visitorSessionId",
    'referral',
    jsonb_strip_nulls(jsonb_build_object(
        'referralCode', "referralCode",
        'referrerUserId', "referrerUserId",
        'referrer', "referrer",
        'userAgent', "userAgent",
        'ipHash', "ipHash",
        'legacyTable', 'ReferralVisit'
    )),
    "createdAt"
FROM "ReferralVisit";

INSERT INTO "PlatformEvent" ("id", "type", "source", "metadata", "createdAt")
SELECT
    'ge_' || "id",
    CASE
        WHEN "event" = 'DETAIL_VIEW' THEN 'VIEW_JOB'::"PlatformEventType"
        WHEN "event" = 'APPLY_CLICK' THEN 'CLICK_APPLY'::"PlatformEventType"
        WHEN "event" = 'SHARE_JOB' THEN 'SHARE_JOB'::"PlatformEventType"
        WHEN "event" = 'SAVE_JOB' THEN 'SAVE_JOB'::"PlatformEventType"
        WHEN "event" IN ('LOGIN_VIEW', 'AUTH_SUCCESS', 'SIGNUP_SUCCESS', 'SIGNUP_VIEW') THEN 'AUTH_STEP'::"PlatformEventType"
        ELSE 'APP_INIT'::"PlatformEventType"
    END,
    "source",
    jsonb_build_object(
        'legacyEvent', "event",
        'legacyTable', 'GrowthEvent'
    ),
    "createdAt"
FROM "GrowthEvent";

-- CreateIndex
CREATE INDEX "PlatformEvent_type_createdAt_idx" ON "PlatformEvent"("type", "createdAt");

-- CreateIndex
CREATE INDEX "PlatformEvent_opportunityId_createdAt_idx" ON "PlatformEvent"("opportunityId", "createdAt");

-- CreateIndex
CREATE INDEX "PlatformEvent_userId_createdAt_idx" ON "PlatformEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PlatformEvent_sessionId_createdAt_idx" ON "PlatformEvent"("sessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "PlatformEvent" ADD CONSTRAINT "PlatformEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformEvent" ADD CONSTRAINT "PlatformEvent_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "ReferralVisit" DROP CONSTRAINT "ReferralVisit_referrerUserId_fkey";

-- DropForeignKey
ALTER TABLE "ReferralVisit" DROP CONSTRAINT "ReferralVisit_visitorUserId_fkey";

-- DropForeignKey
ALTER TABLE "OpportunityClick" DROP CONSTRAINT "OpportunityClick_opportunityId_fkey";

-- DropForeignKey
ALTER TABLE "OpportunityClick" DROP CONSTRAINT "OpportunityClick_userId_fkey";

-- DropTable
DROP TABLE "GrowthEvent";

-- DropTable
DROP TABLE "ReferralVisit";

-- DropTable
DROP TABLE "OpportunityClick";
