-- Referral badges enum
CREATE TYPE "ReferralBadge" AS ENUM (
    'FIRST_INVITE',
    'CONNECTOR',
    'CAMPUS_SCOUT',
    'GROWTH_NODE',
    'NETWORK_BUILDER'
);

-- User referral attribution fields
ALTER TABLE "User"
ADD COLUMN "referralCode" TEXT,
ADD COLUMN "referredByUserId" TEXT,
ADD COLUMN "referredAt" TIMESTAMP(3);

-- Referral visit tracking
CREATE TABLE "ReferralVisit" (
    "id" TEXT NOT NULL,
    "referralCode" TEXT NOT NULL,
    "referrerUserId" TEXT NOT NULL,
    "visitorSessionId" TEXT,
    "visitorUserId" TEXT,
    "referrer" TEXT,
    "userAgent" TEXT,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralVisit_pkey" PRIMARY KEY ("id")
);

-- Referral badge grants
CREATE TABLE "ReferralBadgeGrant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badge" "ReferralBadge" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralBadgeGrant_pkey" PRIMARY KEY ("id")
);

-- Uniques
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");
CREATE UNIQUE INDEX "ReferralBadgeGrant_userId_badge_key" ON "ReferralBadgeGrant"("userId", "badge");

-- Indexes
CREATE INDEX "User_referredByUserId_idx" ON "User"("referredByUserId");
CREATE INDEX "ReferralVisit_referralCode_createdAt_idx" ON "ReferralVisit"("referralCode", "createdAt");
CREATE INDEX "ReferralVisit_referrerUserId_createdAt_idx" ON "ReferralVisit"("referrerUserId", "createdAt");
CREATE INDEX "ReferralVisit_visitorSessionId_createdAt_idx" ON "ReferralVisit"("visitorSessionId", "createdAt");
CREATE INDEX "ReferralVisit_visitorUserId_createdAt_idx" ON "ReferralVisit"("visitorUserId", "createdAt");
CREATE INDEX "ReferralBadgeGrant_badge_createdAt_idx" ON "ReferralBadgeGrant"("badge", "createdAt");

-- Foreign keys
ALTER TABLE "User"
ADD CONSTRAINT "User_referredByUserId_fkey"
FOREIGN KEY ("referredByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReferralVisit"
ADD CONSTRAINT "ReferralVisit_referrerUserId_fkey"
FOREIGN KEY ("referrerUserId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReferralVisit"
ADD CONSTRAINT "ReferralVisit_visitorUserId_fkey"
FOREIGN KEY ("visitorUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReferralBadgeGrant"
ADD CONSTRAINT "ReferralBadgeGrant_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
