-- Migration: add_govt_job_fields_and_shared_resources
-- Based on schema changes in commit 9fa108e

-- ============================================================
-- CreateEnum
-- ============================================================

CREATE TYPE "GovernmentApplicationStatus" AS ENUM (
  'UPCOMING',
  'OPEN',
  'CLOSED',
  'EXAM_SCHEDULED',
  'ADMIT_CARD_RELEASED',
  'ANSWER_KEY_RELEASED',
  'RESULT_DECLARED',
  'COUNSELLING',
  'DOCUMENT_VERIFICATION',
  'COMPLETED',
  'CANCELLED'
);

CREATE TYPE "GovernmentLevel" AS ENUM (
  'CENTRAL',
  'STATE',
  'PSU',
  'BANKING',
  'DEFENCE',
  'JUDICIARY',
  'EDUCATION'
);

CREATE TYPE "VacancyNature" AS ENUM (
  'PERMANENT',
  'TEMPORARY',
  'CONTRACT',
  'APPRENTICESHIP',
  'DEPUTATION'
);

CREATE TYPE "ResourceItemType" AS ENUM (
  'YOUTUBE',
  'GOOGLE_DRIVE',
  'WEBSITE',
  'ROADMAP',
  'LINK'
);

CREATE TYPE "ResourceItemStatus" AS ENUM (
  'PENDING_REVIEW',
  'APPROVED'
);

-- ============================================================
-- AlterTable "GovernmentJobDetails"
-- Drop removed columns, rename/add new columns
-- ============================================================

-- Drop old columns that were removed/replaced
ALTER TABLE "GovernmentJobDetails"
  DROP COLUMN IF EXISTS "postName",
  DROP COLUMN IF EXISTS "applicationMode",
  DROP COLUMN IF EXISTS "applicationModes",
  DROP COLUMN IF EXISTS "vacancies";

-- The old selectionStages was TEXT[] — drop and re-add as Json
ALTER TABLE "GovernmentJobDetails"
  DROP COLUMN IF EXISTS "selectionStages";

-- Add all new columns
ALTER TABLE "GovernmentJobDetails"
  ADD COLUMN IF NOT EXISTS "notificationIssuedDate"  TEXT,
  ADD COLUMN IF NOT EXISTS "applicationStatus"       "GovernmentApplicationStatus",
  ADD COLUMN IF NOT EXISTS "governmentLevel"         "GovernmentLevel",
  ADD COLUMN IF NOT EXISTS "jobCategory"             TEXT[]  NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "vacancyNature"           "VacancyNature",
  ADD COLUMN IF NOT EXISTS "vacancyBreakdown"        JSONB,
  ADD COLUMN IF NOT EXISTS "categoryVacancies"       JSONB,
  ADD COLUMN IF NOT EXISTS "payLevel"                TEXT,
  ADD COLUMN IF NOT EXISTS "basicPay"                INTEGER,
  ADD COLUMN IF NOT EXISTS "allowances"              TEXT[]  NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "applicationFeeDetails"   JSONB,
  ADD COLUMN IF NOT EXISTS "feeBreakdown"            JSONB,
  ADD COLUMN IF NOT EXISTS "ageRelaxationRules"      JSONB,
  ADD COLUMN IF NOT EXISTS "eligibilityDetails"      JSONB,
  ADD COLUMN IF NOT EXISTS "qualificationDetails"    JSONB,
  ADD COLUMN IF NOT EXISTS "physicalStandards"       JSONB,
  ADD COLUMN IF NOT EXISTS "cadreDetails"            JSONB,
  ADD COLUMN IF NOT EXISTS "postPreferences"         JSONB,
  ADD COLUMN IF NOT EXISTS "serviceBond"             JSONB,
  ADD COLUMN IF NOT EXISTS "reservationDetails"      JSONB,
  ADD COLUMN IF NOT EXISTS "examDates"               JSONB,
  ADD COLUMN IF NOT EXISTS "examStages"              JSONB,
  ADD COLUMN IF NOT EXISTS "importantDates"          JSONB,
  ADD COLUMN IF NOT EXISTS "examCenters"             TEXT[]  NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "examPattern"             JSONB,
  ADD COLUMN IF NOT EXISTS "selectionStages"         JSONB,
  ADD COLUMN IF NOT EXISTS "skillTests"              JSONB,
  ADD COLUMN IF NOT EXISTS "requiredDocumentDetails" JSONB,
  ADD COLUMN IF NOT EXISTS "referenceLinks"          JSONB,
  ADD COLUMN IF NOT EXISTS "officialSourceVerified"  BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "sourceLastCheckedAt"     TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "notificationPdfUrl"      TEXT,
  ADD COLUMN IF NOT EXISTS "admitCardUrl"            TEXT,
  ADD COLUMN IF NOT EXISTS "resultUrl"               TEXT,
  ADD COLUMN IF NOT EXISTS "answerKeyUrl"            TEXT,
  ADD COLUMN IF NOT EXISTS "syllabusUrl"             TEXT,
  ADD COLUMN IF NOT EXISTS "previousPapersUrl"       TEXT,
  ADD COLUMN IF NOT EXISTS "extraMetadata"           JSONB,
  ADD COLUMN IF NOT EXISTS "extractionConfidence"    DOUBLE PRECISION;

-- ============================================================
-- CreateTable "SharedResource"
-- ============================================================

CREATE TABLE "SharedResource" (
    "id"              TEXT NOT NULL,
    "title"           TEXT NOT NULL,
    "type"            "ResourceItemType" NOT NULL,
    "url"             TEXT NOT NULL,
    "company"         TEXT,
    "skills"          TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "addedByUserId"   TEXT,
    "addedByUsername" TEXT,
    "status"          "ResourceItemStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedResource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SharedResource_url_key" ON "SharedResource"("url");

CREATE INDEX "SharedResource_company_idx" ON "SharedResource"("company");

CREATE INDEX "SharedResource_skills_idx" ON "SharedResource" USING GIN ("skills");

CREATE INDEX "SharedResource_status_idx" ON "SharedResource"("status");
