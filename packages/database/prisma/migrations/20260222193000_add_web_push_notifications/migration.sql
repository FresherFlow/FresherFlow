-- Add growth funnel events for PWA install analytics
ALTER TYPE "GrowthFunnelEvent" ADD VALUE IF NOT EXISTS 'INSTALL_PROMPT_SHOWN';
ALTER TYPE "GrowthFunnelEvent" ADD VALUE IF NOT EXISTS 'INSTALL_ACCEPTED';
ALTER TYPE "GrowthFunnelEvent" ADD VALUE IF NOT EXISTS 'OPENED_STANDALONE';

-- Add PUSH alert channel
ALTER TYPE "AlertChannel" ADD VALUE IF NOT EXISTS 'PUSH';

-- Persist one active web push subscription per user
CREATE TABLE IF NOT EXISTS "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_userId_key" ON "PushSubscription"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'PushSubscription_userId_fkey'
          AND table_name = 'PushSubscription'
    ) THEN
        ALTER TABLE "PushSubscription"
            ADD CONSTRAINT "PushSubscription_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id")
            ON DELETE CASCADE
            ON UPDATE CASCADE;
    END IF;
END $$;
