-- CreateEnum
CREATE TYPE "LinkHealth" AS ENUM ('HEALTHY', 'BROKEN', 'RETRYING');

-- CreateEnum
CREATE TYPE "GrowthFunnelEvent" AS ENUM ('DETAIL_VIEW', 'LOGIN_VIEW', 'AUTH_SUCCESS', 'SIGNUP_SUCCESS');

-- CreateEnum
CREATE TYPE "AlertChannel" AS ENUM ('EMAIL');

-- CreateEnum
CREATE TYPE "AlertKind" AS ENUM ('DAILY_DIGEST', 'CLOSING_SOON');

-- CreateEnum
CREATE TYPE "TelegramBroadcastStatus" AS ENUM ('SENT', 'FAILED', 'SKIPPED');

-- AlterTable
ALTER TABLE "Opportunity" ADD COLUMN     "companyWebsite" TEXT,
ADD COLUMN     "lastVerifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "linkHealth" "LinkHealth" NOT NULL DEFAULT 'HEALTHY',
ADD COLUMN     "verificationFailures" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "experienceMin" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "experienceMax" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isTwoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totpSecret" TEXT;

-- CreateTable
CREATE TABLE "Authenticator" (
    "credentialID" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "publicKey" BYTEA NOT NULL,
    "counter" INTEGER NOT NULL,
    "deviceType" TEXT NOT NULL,
    "backedUp" BOOLEAN NOT NULL,
    "transports" TEXT,

    CONSTRAINT "Authenticator_pkey" PRIMARY KEY ("credentialID")
);

-- CreateTable
CREATE TABLE "WebAuthnChallenge" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challenge" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebAuthnChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedOpportunity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "dailyDigest" BOOLEAN NOT NULL DEFAULT true,
    "closingSoon" BOOLEAN NOT NULL DEFAULT true,
    "minRelevanceScore" INTEGER NOT NULL DEFAULT 45,
    "preferredHour" INTEGER NOT NULL DEFAULT 8,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastDigestSentAt" TIMESTAMP(3),

    CONSTRAINT "AlertPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrowthEvent" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'unknown',
    "event" "GrowthFunnelEvent" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrowthEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertDelivery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "kind" "AlertKind" NOT NULL,
    "channel" "AlertChannel" NOT NULL DEFAULT 'EMAIL',
    "dedupeKey" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT,

    CONSTRAINT "AlertDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramBroadcast" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "status" "TelegramBroadcastStatus" NOT NULL DEFAULT 'SKIPPED',
    "messageId" TEXT,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramBroadcast_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Authenticator_userId_idx" ON "Authenticator"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WebAuthnChallenge_key_key" ON "WebAuthnChallenge"("key");

-- CreateIndex
CREATE INDEX "WebAuthnChallenge_userId_idx" ON "WebAuthnChallenge"("userId");

-- CreateIndex
CREATE INDEX "WebAuthnChallenge_expiresAt_idx" ON "WebAuthnChallenge"("expiresAt");

-- CreateIndex
CREATE INDEX "SavedOpportunity_userId_idx" ON "SavedOpportunity"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedOpportunity_userId_opportunityId_key" ON "SavedOpportunity"("userId", "opportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "AlertPreference_userId_key" ON "AlertPreference"("userId");

-- CreateIndex
CREATE INDEX "GrowthEvent_createdAt_idx" ON "GrowthEvent"("createdAt");

-- CreateIndex
CREATE INDEX "GrowthEvent_source_event_idx" ON "GrowthEvent"("source", "event");

-- CreateIndex
CREATE UNIQUE INDEX "AlertDelivery_dedupeKey_key" ON "AlertDelivery"("dedupeKey");

-- CreateIndex
CREATE INDEX "AlertDelivery_userId_kind_idx" ON "AlertDelivery"("userId", "kind");

-- CreateIndex
CREATE INDEX "AlertDelivery_sentAt_idx" ON "AlertDelivery"("sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramBroadcast_dedupeKey_key" ON "TelegramBroadcast"("dedupeKey");

-- CreateIndex
CREATE INDEX "TelegramBroadcast_opportunityId_status_idx" ON "TelegramBroadcast"("opportunityId", "status");

-- CreateIndex
CREATE INDEX "TelegramBroadcast_channel_idx" ON "TelegramBroadcast"("channel");

-- CreateIndex
CREATE INDEX "Opportunity_linkHealth_idx" ON "Opportunity"("linkHealth");

-- CreateIndex
CREATE INDEX "Opportunity_lastVerifiedAt_idx" ON "Opportunity"("lastVerifiedAt");

-- AddForeignKey
ALTER TABLE "Authenticator" ADD CONSTRAINT "Authenticator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebAuthnChallenge" ADD CONSTRAINT "WebAuthnChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedOpportunity" ADD CONSTRAINT "SavedOpportunity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedOpportunity" ADD CONSTRAINT "SavedOpportunity_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertPreference" ADD CONSTRAINT "AlertPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertDelivery" ADD CONSTRAINT "AlertDelivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertDelivery" ADD CONSTRAINT "AlertDelivery_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramBroadcast" ADD CONSTRAINT "TelegramBroadcast_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
