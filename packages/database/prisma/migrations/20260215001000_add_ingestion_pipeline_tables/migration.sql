-- Ingestion pipeline schema
CREATE TYPE "IngestionSourceType" AS ENUM ('JSON_FEED', 'WORKDAY', 'GREENHOUSE', 'LEVER', 'CUSTOM');
CREATE TYPE "IngestionRunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED');
CREATE TYPE "RawOpportunityStatus" AS ENUM ('FETCHED', 'DRAFT_CREATED', 'DEDUPED', 'REJECTED', 'ERROR');

CREATE TABLE "IngestionSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceType" "IngestionSourceType" NOT NULL,
    "endpoint" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "runFrequencyMinutes" INTEGER NOT NULL DEFAULT 60,
    "defaultType" "OpportunityType" NOT NULL DEFAULT 'JOB',
    "createdByUserId" TEXT,
    "lastRunAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IngestionSource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IngestionRun" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "status" "IngestionRunStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "fetchedCount" INTEGER NOT NULL DEFAULT 0,
    "draftCreatedCount" INTEGER NOT NULL DEFAULT 0,
    "dedupedCount" INTEGER NOT NULL DEFAULT 0,
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "errorSummary" TEXT,

    CONSTRAINT "IngestionRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RawOpportunity" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "ingestionRunId" TEXT,
    "sourceExternalId" TEXT,
    "status" "RawOpportunityStatus" NOT NULL DEFAULT 'FETCHED',
    "rawPayload" JSONB NOT NULL,
    "title" TEXT,
    "company" TEXT,
    "applyLink" TEXT,
    "suggestedType" "OpportunityType",
    "fresherScore" INTEGER,
    "reasonFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mappedOpportunityId" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RawOpportunity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IngestionSource_enabled_sourceType_idx" ON "IngestionSource"("enabled", "sourceType");
CREATE INDEX "IngestionSource_lastRunAt_idx" ON "IngestionSource"("lastRunAt");

CREATE INDEX "IngestionRun_sourceId_startedAt_idx" ON "IngestionRun"("sourceId", "startedAt");
CREATE INDEX "IngestionRun_status_startedAt_idx" ON "IngestionRun"("status", "startedAt");

CREATE INDEX "RawOpportunity_sourceId_createdAt_idx" ON "RawOpportunity"("sourceId", "createdAt");
CREATE INDEX "RawOpportunity_status_createdAt_idx" ON "RawOpportunity"("status", "createdAt");
CREATE INDEX "RawOpportunity_applyLink_idx" ON "RawOpportunity"("applyLink");
CREATE INDEX "RawOpportunity_sourceExternalId_idx" ON "RawOpportunity"("sourceExternalId");

ALTER TABLE "IngestionSource" ADD CONSTRAINT "IngestionSource_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IngestionRun" ADD CONSTRAINT "IngestionRun_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "IngestionSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RawOpportunity" ADD CONSTRAINT "RawOpportunity_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "IngestionSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RawOpportunity" ADD CONSTRAINT "RawOpportunity_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "IngestionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RawOpportunity" ADD CONSTRAINT "RawOpportunity_mappedOpportunityId_fkey" FOREIGN KEY ("mappedOpportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
