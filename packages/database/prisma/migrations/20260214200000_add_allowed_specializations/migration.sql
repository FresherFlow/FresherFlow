ALTER TABLE "Opportunity"
ADD COLUMN "allowedSpecializations" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX "Opportunity_allowedSpecializations_idx"
ON "Opportunity"
USING GIN ("allowedSpecializations");
