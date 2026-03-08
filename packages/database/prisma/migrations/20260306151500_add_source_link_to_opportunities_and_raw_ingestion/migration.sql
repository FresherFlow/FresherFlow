-- Store the original listing URL separately from the direct apply URL.
-- In some cases both values will be the same; in others only one may exist.

ALTER TABLE "Opportunity"
ADD COLUMN "sourceLink" TEXT;

ALTER TABLE "RawOpportunity"
ADD COLUMN "sourceLink" TEXT;

CREATE INDEX "Opportunity_sourceLink_idx" ON "Opportunity"("sourceLink");
CREATE INDEX "RawOpportunity_sourceLink_idx" ON "RawOpportunity"("sourceLink");
