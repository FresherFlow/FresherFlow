ALTER TABLE "Opportunity"
ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "GovernmentJobDetails" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "department" TEXT,
    "organization" TEXT,
    "officialWebsiteUrl" TEXT,
    "officialNotificationUrl" TEXT,
    "advertisementNumber" TEXT,
    "postName" TEXT,
    "applicationMode" TEXT,
    "vacancyCount" INTEGER,
    "applicationFee" TEXT,
    "ageMin" INTEGER,
    "ageMax" INTEGER,
    "ageRelaxation" TEXT,
    "reservationNotes" TEXT,
    "importantInstructions" TEXT,
    "applicationStartDate" TEXT,
    "applicationEndDate" TEXT,
    "examDate" TEXT,
    "admitCardDate" TEXT,
    "resultDate" TEXT,
    "selectionStages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requiredDocuments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "seoTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GovernmentJobDetails_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GovernmentJobDetails_opportunityId_key" ON "GovernmentJobDetails"("opportunityId");
CREATE INDEX "Opportunity_tags_idx" ON "Opportunity" USING GIN ("tags");
CREATE INDEX "GovernmentJobDetails_department_idx" ON "GovernmentJobDetails"("department");
CREATE INDEX "GovernmentJobDetails_organization_idx" ON "GovernmentJobDetails"("organization");
CREATE INDEX "GovernmentJobDetails_seoTags_idx" ON "GovernmentJobDetails" USING GIN ("seoTags");

ALTER TABLE "GovernmentJobDetails"
ADD CONSTRAINT "GovernmentJobDetails_opportunityId_fkey"
FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
