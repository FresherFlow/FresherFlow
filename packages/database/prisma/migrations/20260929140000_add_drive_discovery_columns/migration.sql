-- Denormalised drive discovery columns on Opportunity.
--
-- DriveDetails.dates is an unsized DateTime[] scalar list and DriveDetails.city
-- lives on a 1:1 relation, so "walk-ins in city X in the next 7 days" and
-- "walk-ins near me" had to load every walk-in row into Node and filter there.
-- These two columns make both an indexed comparison on the row being listed.
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "nextDriveAt" TIMESTAMP(3);
ALTER TABLE "Opportunity" ADD COLUMN IF NOT EXISTS "driveCity" TEXT;

-- Backfill: earliest still-future drive date and the drive's city.
-- `unnest` + `DISTINCT ON` handles the array without needing a GIN index, which
-- would not help range containment anyway.
UPDATE "Opportunity" o
SET "nextDriveAt" = d."next_drive_at"
FROM (
    SELECT
        "opportunityId",
        MIN(dte) AS "next_drive_at"
    FROM "DriveDetails", unnest("dates") AS dte
    WHERE dte > NOW()
    GROUP BY "opportunityId"
) d
WHERE o."id" = d."opportunityId";

UPDATE "Opportunity" o
SET "driveCity" = NULLIF(TRIM(d."city"), '')
FROM "DriveDetails" d
WHERE o."id" = d."opportunityId";

CREATE INDEX IF NOT EXISTS "Opportunity_status_nextDriveAt_idx" ON "Opportunity"("status", "nextDriveAt");
CREATE INDEX IF NOT EXISTS "Opportunity_driveCity_nextDriveAt_idx" ON "Opportunity"("driveCity", "nextDriveAt");
