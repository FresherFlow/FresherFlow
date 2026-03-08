DO $$ BEGIN
    CREATE TYPE "AlertDispatchStatus" AS ENUM ('INITIATED', 'SENT', 'FAILED', 'SKIPPED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AlertDispatchReason" AS ENUM (
        'DEDUPE_HIT',
        'DAILY_CAP',
        'PREFERENCE_DISABLED',
        'NOT_ELIGIBLE',
        'CHANNEL_ERROR',
        'ENUM_FALLBACK',
        'VALIDATION_ERROR',
        'SENT_OK'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "AlertDispatchLog" (
    "id" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "userId" TEXT,
    "opportunityId" TEXT,
    "kind" "AlertKind" NOT NULL,
    "channel" "AlertChannel",
    "status" "AlertDispatchStatus" NOT NULL,
    "reason" "AlertDispatchReason",
    "dedupeKey" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "attemptedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertDispatchLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AlertDispatchLog_correlationId_idx" ON "AlertDispatchLog"("correlationId");
CREATE INDEX IF NOT EXISTS "AlertDispatchLog_createdAt_idx" ON "AlertDispatchLog"("createdAt");
CREATE INDEX IF NOT EXISTS "AlertDispatchLog_status_createdAt_idx" ON "AlertDispatchLog"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "AlertDispatchLog_kind_channel_createdAt_idx" ON "AlertDispatchLog"("kind", "channel", "createdAt");
CREATE INDEX IF NOT EXISTS "AlertDispatchLog_reason_createdAt_idx" ON "AlertDispatchLog"("reason", "createdAt");

DO $$ BEGIN
    ALTER TABLE "AlertDispatchLog"
    ADD CONSTRAINT "AlertDispatchLog_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "AlertDispatchLog"
    ADD CONSTRAINT "AlertDispatchLog_opportunityId_fkey"
    FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
