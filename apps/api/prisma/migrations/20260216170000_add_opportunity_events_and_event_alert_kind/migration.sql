-- Add alert kind for timeline reminders
ALTER TYPE "AlertKind" ADD VALUE IF NOT EXISTS 'EVENT_REMINDER';

-- Create enum for opportunity event timeline
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OpportunityEventType') THEN
        CREATE TYPE "OpportunityEventType" AS ENUM (
            'NOTIFICATION',
            'REG_START',
            'REG_END',
            'EXAM_DATE',
            'RESULT',
            'INTERVIEW',
            'DOC_VERIFICATION',
            'OTHER'
        );
    END IF;
END $$;

-- Create opportunity events table
CREATE TABLE IF NOT EXISTS "OpportunityEvent" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "eventType" "OpportunityEventType" NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "sourceLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OpportunityEvent_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "OpportunityEvent"
    ADD CONSTRAINT "OpportunityEvent_opportunityId_fkey"
    FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "OpportunityEvent_opportunityId_eventDate_idx"
    ON "OpportunityEvent"("opportunityId", "eventDate");

CREATE INDEX IF NOT EXISTS "OpportunityEvent_eventDate_idx"
    ON "OpportunityEvent"("eventDate");
