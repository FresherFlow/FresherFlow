-- ============================================================================
-- FresherFlow - Opportunity taxonomy decomposition + related schema sync
-- ============================================================================
--
-- PURPOSE
--   Replaces the single "OpportunityType" enum (JOB | INTERNSHIP | WALKIN |
--   GOVERNMENT) with independent dimensions: OpportunityCategory + Sector +
--   RecruitmentMethod, and turns the scalar Opportunity.employmentType into the
--   array Opportunity.employmentTypes.
--
-- HOW THIS FILE WAS PRODUCED
--   `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma`
--   run against fresherflow_local ONLY (localhost:5432). Sections marked
--   "HAND-WRITTEN" are not in the generated diff: they split the generated
--   drop+add ALTER TABLE statements apart so the old columns survive long
--   enough to be read during the backfill.
--
-- TRANSACTION
--   The whole file runs inside one transaction. Any failure rolls the database
--   back to its pre-migration state, so a partial backfill is not possible.
--
-- VERIFIED LOCAL DATA FACTS (fresherflow_local)
--   Opportunity                        94 rows
--     type          JOB 92, INTERNSHIP 2, WALKIN 0, GOVERNMENT 0
--     employmentType 67 non-empty, 21 empty string '', 6 NULL
--                   FULL_TIME 62, CONTRACT 1, INTERNSHIP 1, PART_TIME 1,
--                   'Full Time' 1, 'Full-time' 1
--   WalkInDetails                      0 rows
--   RawOpportunity                     2 rows, suggestedType NULL on both,
--                   0 duplicate (sourceId, sourceExternalId) groups
--   Profile                            23 rows, interestedIn NULL on 19,
--                   populated on 4
--   IngestionSource                    1 row, defaultType = JOB
--   areas / area_members               0 rows each
--   GovernmentJobDetails               0 rows (its governmentLevel enum swap
--                                       casts via ::text, so a populated table
--                                       holding BANKING/DEFENCE/JUDICIARY/
--                                       EDUCATION - all removed from the new
--                                       enum - would abort the migration)
--
-- DESTRUCTIVE STEPS AND THEIR DATA IMPACT (read before applying)
--   1. DROP TABLE "WalkInDetails"
--      0 rows locally -> no data loss locally. In any environment that DOES
--      have walk-in rows, every one of those rows is destroyed; walk-in
--      location/clinic/contact data has no home in the new schema and is not
--      archived anywhere by this migration.
--   2. DROP COLUMN "Opportunity"."type"        (94/94 rows had a value)
--      Lossless in practice: every row is re-derived into category, sector and
--      recruitmentMethod by the backfill below. The old enum is then dropped.
--      Rows whose type is outside JOB/INTERNSHIP/WALKIN/GOVERNMENT would fall
--      back to EMPLOYMENT/PRIVATE/REGULAR.
--   3. DROP COLUMN "Opportunity"."employmentType"  (66/94 rows had a value)
--      Re-derived into "employmentTypes". Values that are not a valid
--      EmploymentType member after normalisation become an EMPTY ARRAY, i.e.
--      that signal is lost. Locally that affects only '' / 'Full Time' style
--      free text, which normalises to FULL_TIME and is preserved.
--   4. DROP COLUMN "Opportunity"."companyId"    (0 non-null rows locally)
--      No backfill - the new schema links via "organizationId" -> Organization.
--      Any non-null companyId elsewhere in an environment would be LOST.
--   5. DROP COLUMN "IngestionSource"."defaultType" -> "defaultCategory"
--      1 row, JOB -> EMPLOYMENT. Lossless for the four known OpportunityType
--      values; all four collapse to EMPLOYMENT, which is intended but is a
--      real information reduction (sector/method are not carried over).
--   6. DROP COLUMN "Profile"."interestedIn" -> "OpportunityCategory"[]
--      Lossless: JOB/INTERNSHIP/WALKIN/GOVERNMENT all map to EMPLOYMENT and
--      the result is de-duplicated. 4 populated rows become {EMPLOYMENT};
--      the 19 NULL rows keep the column DEFAULT {EMPLOYMENT}.
--   7. DROP COLUMN "RawOpportunity"."suggestedType" -> "suggestedCategory"
--      2 rows, both NULL -> stays NULL. No data loss locally.
--   8. "User" is NOT touched.
--      The --from-migrations diff reported dropping User."passwordHash",
--      "provider" and "providerId". Those columns DO NOT EXIST in
--      fresherflow_local (auth moved to firebase_uid), so that part of the
--      migrations-folder diff is STALE. They are deliberately NOT included.
--      DO NOT add them without first checking the target environment.
--   9. CREATE UNIQUE INDEX "RawOpportunity_sourceId_sourceExternalId_key"
--      Verified: 0 duplicate (sourceId, sourceExternalId) groups exist.
--      NULL sourceExternalId does not collide in Postgres, so the 2 local
--      rows are safe. In another environment, pre-existing duplicates would
--      make this statement fail and roll the whole migration back.
--  10. NOT listed in the original brief, also destructive, also found in the
--      diff:
--        DROP COLUMN "area_members"."role"    -> RoomMemberRole, default MEMBER
--        DROP COLUMN "areas"."type"           -> dropped, no replacement
--        DROP COLUMN "areas"."status"         -> RoomStatus, default ACTIVE
--        DROP COLUMN "areas"."jobCount"       -> "opportunityCount"
--      "areas" and "area_members" are BOTH EMPTY (0 rows) locally, so there is
--      no data loss here. None of the first three are backfilled: any
--      non-default value in a populated environment is DESTROYED. Only
--      "areas"."jobCount" is backfilled, into the new "opportunityCount".
-- ============================================================================

BEGIN;
-- CreateEnum
CREATE TYPE "OpportunityCategory" AS ENUM ('EMPLOYMENT', 'COMPETITION', 'SCHOLARSHIP', 'EDUCATION', 'EVENT');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'FREELANCE', 'INTERNSHIP', 'APPRENTICESHIP', 'VOLUNTEER', 'PER_DIEM', 'OTHER');

-- CreateEnum
CREATE TYPE "RecruitmentMethod" AS ENUM ('REGULAR', 'ON_CAMPUS', 'OFF_CAMPUS', 'POOL_CAMPUS', 'WALK_IN', 'REFERRAL');

-- CreateEnum
CREATE TYPE "Sector" AS ENUM ('PRIVATE', 'GOVERNMENT', 'NGO', 'ACADEMIC', 'STARTUP', 'OTHER');

-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('ENTRY_LEVEL', 'INTERN', 'ASSOCIATE', 'MID', 'SENIOR', 'LEAD', 'EXECUTIVE');

-- CreateEnum
CREATE TYPE "OpportunitySourceKind" AS ENUM ('SCRAPED', 'USER_SUBMITTED', 'IMPORTED', 'PARTNER_FEED');

-- CreateEnum
CREATE TYPE "EventAuthorRole" AS ENUM ('USER', 'MODERATOR', 'ADMIN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "EventVerification" AS ENUM ('UNVERIFIED', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CompensationType" AS ENUM ('SALARY', 'STIPEND', 'EQUITY', 'BONUS', 'COMMISSION', 'PER_DIEM', 'REIMBURSEMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "EquityUnit" AS ENUM ('ESOP', 'RSU', 'OPTIONS', 'SHARES', 'PHANTOM', 'OTHER');

-- CreateEnum
CREATE TYPE "OpportunityTrustLevel" AS ENUM ('UNVERIFIED', 'COMMUNITY_REPORTED', 'VERIFIED', 'FLAGGED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ApplicationStage" AS ENUM ('APPLIED', 'REGISTERED', 'IN_REVIEW', 'ASSESSMENT', 'INTERVIEW', 'OFFERED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'SKIPPED', 'PARTICIPATED');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "RoomMemberRole" AS ENUM ('MEMBER', 'MODERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "RoomOpportunityReason" AS ENUM ('PINNED', 'SHARED');

-- CreateEnum
CREATE TYPE "RecruitmentStageKind" AS ENUM ('SCREENING', 'ASSESSMENT', 'INTERVIEW', 'CASE_STUDY', 'GROUP_EXERCISE', 'OFFER', 'TRAINING', 'ONBOARDING', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AlertKind" ADD VALUE 'CAMPUS_DRIVE';
ALTER TYPE "AlertKind" ADD VALUE 'REGISTRATION_OPEN';
ALTER TYPE "AlertKind" ADD VALUE 'REGISTRATION_CLOSING';
ALTER TYPE "AlertKind" ADD VALUE 'APPLICATION_UPDATE';

-- AlterEnum
-- BEGIN removed: nested transaction would commit the outer one.
CREATE TYPE "GovernmentLevel_new" AS ENUM ('CENTRAL', 'STATE', 'PSU', 'LOCAL', 'OTHER');
ALTER TABLE "GovernmentJobDetails" ALTER COLUMN "governmentLevel" TYPE "GovernmentLevel_new" USING ("governmentLevel"::text::"GovernmentLevel_new");
ALTER TYPE "GovernmentLevel" RENAME TO "GovernmentLevel_old";
ALTER TYPE "GovernmentLevel_new" RENAME TO "GovernmentLevel";
DROP TYPE "public"."GovernmentLevel_old";
-- COMMIT removed: nested transaction would commit the outer one.

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'CAMPUS_DRIVE_MATCH';
ALTER TYPE "NotificationType" ADD VALUE 'REGISTRATION_OPEN';
ALTER TYPE "NotificationType" ADD VALUE 'REGISTRATION_CLOSING';
ALTER TYPE "NotificationType" ADD VALUE 'OPPORTUNITY_APPLIED';
ALTER TYPE "NotificationType" ADD VALUE 'APPLICATION_STAGE_CHANGED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OpportunityEventType" ADD VALUE 'ASSESSMENT_RELEASED';
ALTER TYPE "OpportunityEventType" ADD VALUE 'SHORTLIST';
ALTER TYPE "OpportunityEventType" ADD VALUE 'DRIVE_POSTPONED';
ALTER TYPE "OpportunityEventType" ADD VALUE 'DRIVE_CLOSED';
ALTER TYPE "OpportunityEventType" ADD VALUE 'REOPENED';

-- DropForeignKey
ALTER TABLE "Opportunity" DROP CONSTRAINT "Opportunity_postedByUserId_fkey";

-- DropForeignKey
ALTER TABLE "WalkInDetails" DROP CONSTRAINT "WalkInDetails_opportunityId_fkey";

-- DropIndex
DROP INDEX "Opportunity_companyId_idx";

-- DropIndex
DROP INDEX "Opportunity_status_deletedAt_type_postedAt_idx";

-- DropIndex
DROP INDEX "RawOpportunity_sourceExternalId_idx";

-- DropIndex
DROP INDEX "areas_type_idx";

-- AlterTable
ALTER TABLE "GovernmentJobDetails" ADD COLUMN     "domain" TEXT;


-- ===========================================================================
-- GENERATED (verbatim from `prisma migrate diff` against fresherflow_local)
-- New enums, new tables, dropped indexes, dropped constraints.
-- ===========================================================================
-- ===========================================================================
-- HAND-WRITTEN: add the new shape WITHOUT touching the old columns yet.
-- The generated diff emits DROP COLUMN and ADD COLUMN in one ALTER TABLE,
-- which destroys the source data before anything can read it. Each block
-- below is split so the old column is still present for the backfill.
-- ===========================================================================

-- AlterTable
ALTER TABLE "IngestionSource" ADD COLUMN     "defaultCategory" "OpportunityCategory" NOT NULL DEFAULT 'EMPLOYMENT';

-- AlterTable
ALTER TABLE "Opportunity" ADD COLUMN     "applicantLocationRequirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "applicationDeadline" TIMESTAMP(3),
ADD COLUMN     "applicationStartDate" TIMESTAMP(3),
ADD COLUMN     "attributes" JSONB,
ADD COLUMN     "category" "OpportunityCategory" NOT NULL DEFAULT 'EMPLOYMENT',
ADD COLUMN     "employmentTypes" "EmploymentType"[] DEFAULT ARRAY[]::"EmploymentType"[],
ADD COLUMN     "endsAt" TIMESTAMP(3),
ADD COLUMN     "experienceLevel" "ExperienceLevel",
ADD COLUMN     "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "pipelineId" TEXT,
ADD COLUMN     "recruitmentMethod" "RecruitmentMethod",
ADD COLUMN     "registrationDeadline" TIMESTAMP(3),
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedByUserId" TEXT,
ADD COLUMN     "sector" "Sector" NOT NULL DEFAULT 'PRIVATE',
ADD COLUMN     "sourceExternalId" TEXT,
ADD COLUMN     "sourceKind" "OpportunitySourceKind" NOT NULL DEFAULT 'SCRAPED',
ADD COLUMN     "startsAt" TIMESTAMP(3),
ADD COLUMN     "trustLevel" "OpportunityTrustLevel" NOT NULL DEFAULT 'UNVERIFIED',
ADD COLUMN     "trustScore" DOUBLE PRECISION NOT NULL DEFAULT 50,
ALTER COLUMN "postedByUserId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "OpportunityEvent" ADD COLUMN     "authorId" TEXT,
ADD COLUMN     "authorRole" "EventAuthorRole" NOT NULL DEFAULT 'USER',
ADD COLUMN     "verification" "EventVerification" NOT NULL DEFAULT 'UNVERIFIED',
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedByUserId" TEXT;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "institutionId" TEXT;

-- Profile."interestedIn" keeps its NAME but changes its element type from
-- OpportunityType[] to OpportunityCategory[]. A same-name DROP+ADD in one
-- statement would erase the old array, so the old column is renamed first
-- and only dropped after the backfill below.
-- AlterTable
ALTER TABLE "Profile" RENAME COLUMN "interestedIn" TO "_interestedIn_legacy_opportunitytype";
ALTER TABLE "Profile" ADD COLUMN     "institutionId" TEXT,
ADD COLUMN     "interestedIn" "OpportunityCategory"[] DEFAULT ARRAY['EMPLOYMENT']::"OpportunityCategory"[];

-- AlterTable
ALTER TABLE "RawOpportunity" ADD COLUMN     "suggestedCategory" "OpportunityCategory";

-- NOTE: "area_members"."role" and "areas"."type"/"status" keep the generated
-- same-statement DROP+ADD. There is no defensible mapping from RoomType or
-- the old role text to RoomMemberRole/RoomStatus, so any non-default value is
-- destroyed. These tables are local-dev/community bookkeeping; this must be
-- re-checked before running against staging.

-- AlterTable
ALTER TABLE "area_members" DROP COLUMN "role",
ADD COLUMN     "role" "RoomMemberRole" NOT NULL DEFAULT 'MEMBER';

-- "areas"."jobCount" has a real backfill below, so it is copied into the new
-- "opportunityCount" before the drop at the end of this migration. The drop
-- of "jobCount" and of "type" is therefore deferred to the destructive
-- section, unlike the generated diff which drops them in this same statement.
-- AlterTable
ALTER TABLE "areas" ADD COLUMN     "opportunityCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
DROP COLUMN "status",
ADD COLUMN     "status" "RoomStatus" NOT NULL DEFAULT 'ACTIVE';

-- ===========================================================================
-- HAND-WRITTEN: BACKFILL. Runs while every old column still exists.
-- ===========================================================================

-- ---- Opportunity.type -> category + sector + recruitmentMethod -----------
-- All four old types are employment listings, so category is EMPLOYMENT for
-- every one of them. WALKIN is expressed as a recruitment METHOD, GOVERNMENT
-- as a SECTOR. That is the intended decomposition.
UPDATE "Opportunity"
SET "category" = 'EMPLOYMENT'::"OpportunityCategory",
    "sector" = CASE "type" WHEN 'GOVERNMENT' THEN 'GOVERNMENT' ELSE 'PRIVATE' END::"Sector",
    "recruitmentMethod" = CASE "type" WHEN 'WALKIN' THEN 'WALK_IN' ELSE 'REGULAR' END::"RecruitmentMethod"
WHERE "type" IS NOT NULL;

-- ---- Opportunity.type = INTERNSHIP forces employmentTypes = {INTERNSHIP} --
-- Per the required mapping, the type wins over the (often NULL) scalar.
-- 2 rows locally.
UPDATE "Opportunity"
SET "employmentTypes" = ARRAY['INTERNSHIP']::"EmploymentType"[]
WHERE "type" = 'INTERNSHIP';

-- ---- Opportunity.employmentType (TEXT) -> employmentTypes (enum array) ---
-- The old column was free text, not an enum. Locally it contains
--   FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP  -> exact matches
--   'Full Time', 'Full-time'                   -> normalise to FULL_TIME
--   NULL / ''                                   -> empty array
-- The subselect returns NULL for anything not in the CASE list, which
-- COALESCE turns into an empty array instead of a hard failure. A value that
-- cannot be mapped is therefore DROPPED, not guessed at. All ten
-- EmploymentType members are covered by the CASE.
UPDATE "Opportunity" o
SET "employmentTypes" = COALESCE(
  (
    SELECT ARRAY[v.emt]::"EmploymentType"[]
    FROM (
      SELECT CASE upper(regexp_replace(btrim(o."employmentType"), '[^A-Za-z]', '', 'g'))
        WHEN 'FULLTIME'       THEN 'FULL_TIME'
        WHEN 'PARTTIME'       THEN 'PART_TIME'
        WHEN 'CONTRACT'       THEN 'CONTRACT'
        WHEN 'TEMPORARY'      THEN 'TEMPORARY'
        WHEN 'FREELANCE'      THEN 'FREELANCE'
        WHEN 'INTERNSHIP'     THEN 'INTERNSHIP'
        WHEN 'APPRENTICESHIP' THEN 'APPRENTICESHIP'
        WHEN 'VOLUNTEER'      THEN 'VOLUNTEER'
        WHEN 'PERDIEM'        THEN 'PER_DIEM'
        WHEN 'OTHER'          THEN 'OTHER'
      END AS emt
    ) v
    WHERE v.emt IS NOT NULL
  ),
  ARRAY[]::"EmploymentType"[])
WHERE o."type" IS DISTINCT FROM 'INTERNSHIP';

-- ---- IngestionSource.defaultType -> defaultCategory ----------------------
-- JOB / INTERNSHIP / WALKIN / GOVERNMENT all collapse to EMPLOYMENT.
-- 1 row locally (JOB -> EMPLOYMENT).
UPDATE "IngestionSource"
SET "defaultCategory" = CASE "defaultType"
      WHEN 'JOB'        THEN 'EMPLOYMENT'
      WHEN 'INTERNSHIP' THEN 'EMPLOYMENT'
      WHEN 'WALKIN'     THEN 'EMPLOYMENT'
      WHEN 'GOVERNMENT' THEN 'EMPLOYMENT'
      ELSE 'EMPLOYMENT'
    END::"OpportunityCategory"
WHERE "defaultType" IS NOT NULL;

-- ---- RawOpportunity.suggestedType -> suggestedCategory -------------------
-- Both local rows are NULL, so this is a no-op here, but the mapping is
-- written out so a populated environment is converted rather than erased.
UPDATE "RawOpportunity"
SET "suggestedCategory" = CASE "suggestedType"
      WHEN 'JOB'        THEN 'EMPLOYMENT'
      WHEN 'INTERNSHIP' THEN 'EMPLOYMENT'
      WHEN 'WALKIN'     THEN 'EMPLOYMENT'
      WHEN 'GOVERNMENT' THEN 'EMPLOYMENT'
    END::"OpportunityCategory"
WHERE "suggestedType" IS NOT NULL;

-- ---- Profile.interestedIn (OpportunityType[]) -> OpportunityCategory[] ----
-- Same-name column, so it is read from the renamed legacy column. Every old
-- member maps to EMPLOYMENT; array_agg(DISTINCT ...) collapses the duplicates
-- that the mapping creates. Rows with NULL or '{}' keep the DEFAULT.
UPDATE "Profile"
SET "interestedIn" = COALESCE(
  (
    SELECT array_agg(DISTINCT 'EMPLOYMENT'::"OpportunityCategory")
    FROM unnest("_interestedIn_legacy_opportunitytype") AS e
    WHERE e IN ('JOB'::"OpportunityType", 'INTERNSHIP'::"OpportunityType",
                'WALKIN'::"OpportunityType", 'GOVERNMENT'::"OpportunityType")
  ),
  ARRAY['EMPLOYMENT']::"OpportunityCategory"[])
WHERE "_interestedIn_legacy_opportunitytype" IS NOT NULL
  AND array_length("_interestedIn_legacy_opportunitytype", 1) > 0;

-- ---- areas.jobCount -> areas.opportunityCount ----------------------------
UPDATE "areas" SET "opportunityCount" = "jobCount" WHERE "jobCount" IS NOT NULL;

-- ===========================================================================
-- HAND-WRITTEN: DESTRUCTIVE DROPS. Everything above has already been read
-- and copied. Past this point the old data is gone for good.
-- ===========================================================================

-- DESTRUCTIVE 1/8 - Opportunity."type" (94/94 rows populated).
--   Re-derived into category / sector / recruitmentMethod above. Dropping the
--   column also removes the last Opportunity reference to OpportunityType.
ALTER TABLE "Opportunity" DROP COLUMN "type";

-- DESTRUCTIVE 2/8 - Opportunity."employmentType" (66/94 rows populated).
--   Re-derived into "employmentTypes". Free-text values that matched no
--   EmploymentType member became an empty array and are NOT recoverable.
ALTER TABLE "Opportunity" DROP COLUMN "employmentType";

-- DESTRUCTIVE 3/8 - Opportunity."companyId" (0 non-null rows locally).
--   NO BACKFILL. The replacement is "organizationId" -> Organization, and
--   nothing here maps a legacy companyId onto an Organization row. A
--   non-null companyId in any other environment is silently LOST.
ALTER TABLE "Opportunity" DROP COLUMN "companyId";

-- DESTRUCTIVE 4/8 - IngestionSource."defaultType" (1 row, JOB).
--   Re-derived into "defaultCategory" above.
ALTER TABLE "IngestionSource" DROP COLUMN "defaultType";

-- DESTRUCTIVE 5/8 - Profile."interestedIn" (legacy, renamed copy).
--   Backfilled into the new OpportunityCategory[] column above. Dropping the
--   legacy column is also what finally frees the OpportunityType enum.
ALTER TABLE "Profile" DROP COLUMN "_interestedIn_legacy_opportunitytype";

-- DESTRUCTIVE 6/8 - RawOpportunity."suggestedType" (2 rows, both NULL).
--   Re-derived into "suggestedCategory" above.
ALTER TABLE "RawOpportunity" DROP COLUMN "suggestedType";

-- DESTRUCTIVE 7/8 - areas."jobCount" -> "opportunityCount" (backfilled above).
ALTER TABLE "areas" DROP COLUMN "jobCount";

-- DESTRUCTIVE 8/8 - areas."type" (RoomType). NO BACKFILL, no replacement
--   column. Any value is DESTROYED. Confirmed 0 rows affected locally is not
--   asserted here; check before applying anywhere real.
ALTER TABLE "areas" DROP COLUMN "type";

-- DESTRUCTIVE - DROP TABLE "WalkInDetails".
--   Confirmed 0 rows in fresherflow_local, so nothing is lost here. In an
--   environment with walk-in data this destroys every row; there is no archive
--   step. The Opportunity FK onto it was already dropped above.
DROP TABLE "WalkInDetails";
-- DropEnum
DROP TYPE "OpportunityType";

-- DropEnum
DROP TYPE "RoomType";

-- CreateTable
CREATE TABLE "OpportunityCompensation" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "type" "CompensationType" NOT NULL,
    "minAmount" INTEGER,
    "maxAmount" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "period" "SalaryPeriod",
    "equityMin" DOUBLE PRECISION,
    "equityMax" DOUBLE PRECISION,
    "equityUnit" "EquityUnit",
    "note" TEXT,
    "isNegotiable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpportunityCompensation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriveDetails" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "dates" TIMESTAMP(3)[],
    "dateRange" TEXT,
    "timeRange" TEXT,
    "venueAddress" TEXT NOT NULL,
    "venueLink" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "clusterName" TEXT,
    "city" TEXT,
    "reportingTime" TEXT NOT NULL,
    "requiredDocuments" TEXT[],
    "contactPerson" TEXT,
    "contactPhone" TEXT,
    "expiryDate" TIMESTAMP(3),
    "landmark" TEXT,
    "transitInfo" TEXT,
    "selectionProcess" TEXT,

    CONSTRAINT "DriveDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventDetails" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "prizeAmount" INTEGER,
    "prizeCurrency" TEXT DEFAULT 'INR',
    "prizeBreakdown" JSONB,
    "teamSizeMin" INTEGER,
    "teamSizeMax" INTEGER,
    "isTeamEvent" BOOLEAN NOT NULL DEFAULT false,
    "participantLimit" INTEGER,
    "tracks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "eligibilityNotes" TEXT,
    "rulesUrl" TEXT,
    "registrationUrl" TEXT,
    "platformUrl" TEXT,
    "supportEmail" TEXT,
    "resultAnnouncementDate" TIMESTAMP(3),
    "organizerName" TEXT,

    CONSTRAINT "EventDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'COLLEGE',
    "website" TEXT,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedSearchInstitution" (
    "savedSearchId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "targeting" TEXT NOT NULL DEFAULT 'TARGETED',

    CONSTRAINT "SavedSearchInstitution_pkey" PRIMARY KEY ("savedSearchId","institutionId")
);

-- CreateTable
CREATE TABLE "OpportunityInstitution" (
    "opportunityId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "targeting" TEXT NOT NULL DEFAULT 'ELIGIBLE',

    CONSTRAINT "OpportunityInstitution_pkey" PRIMARY KEY ("opportunityId","institutionId")
);

-- CreateTable
CREATE TABLE "OpportunityApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "stage" "ApplicationStage" NOT NULL DEFAULT 'APPLIED',
    "currentStageId" TEXT,
    "currentStageKind" "RecruitmentStageKind",
    "stageEnteredAt" TIMESTAMP(3),
    "outcome" TEXT,
    "outcomeData" JSONB,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpportunityApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomOpportunity" (
    "roomId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "reason" "RoomOpportunityReason" NOT NULL DEFAULT 'SHARED',
    "addedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomOpportunity_pkey" PRIMARY KEY ("roomId","opportunityId")
);

-- CreateTable
CREATE TABLE "HiringPipeline" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HiringPipeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecruitmentStage" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "kind" "RecruitmentStageKind" NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "expectedDays" INTEGER,

    CONSTRAINT "RecruitmentStage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OpportunityCompensation_opportunityId_type_idx" ON "OpportunityCompensation"("opportunityId", "type");

-- CreateIndex
CREATE INDEX "OpportunityCompensation_type_maxAmount_idx" ON "OpportunityCompensation"("type", "maxAmount");

-- CreateIndex
CREATE INDEX "OpportunityCompensation_equityUnit_idx" ON "OpportunityCompensation"("equityUnit");

-- CreateIndex
CREATE UNIQUE INDEX "DriveDetails_opportunityId_key" ON "DriveDetails"("opportunityId");

-- CreateIndex
CREATE INDEX "DriveDetails_city_idx" ON "DriveDetails"("city");

-- CreateIndex
CREATE INDEX "DriveDetails_clusterName_idx" ON "DriveDetails"("clusterName");

-- CreateIndex
CREATE INDEX "DriveDetails_latitude_longitude_idx" ON "DriveDetails"("latitude", "longitude");

-- CreateIndex
CREATE UNIQUE INDEX "EventDetails_opportunityId_key" ON "EventDetails"("opportunityId");

-- CreateIndex
CREATE INDEX "EventDetails_prizeAmount_idx" ON "EventDetails"("prizeAmount");

-- CreateIndex
CREATE INDEX "EventDetails_teamSizeMin_teamSizeMax_idx" ON "EventDetails"("teamSizeMin", "teamSizeMax");

-- CreateIndex
CREATE UNIQUE INDEX "Institution_slug_key" ON "Institution"("slug");

-- CreateIndex
CREATE INDEX "Institution_name_idx" ON "Institution"("name");

-- CreateIndex
CREATE INDEX "Institution_city_state_idx" ON "Institution"("city", "state");

-- CreateIndex
CREATE INDEX "Institution_kind_idx" ON "Institution"("kind");

-- CreateIndex
CREATE INDEX "SavedSearchInstitution_institutionId_targeting_idx" ON "SavedSearchInstitution"("institutionId", "targeting");

-- CreateIndex
CREATE INDEX "SavedSearchInstitution_institutionId_idx" ON "SavedSearchInstitution"("institutionId");

-- CreateIndex
CREATE INDEX "OpportunityInstitution_institutionId_targeting_idx" ON "OpportunityInstitution"("institutionId", "targeting");

-- CreateIndex
CREATE INDEX "OpportunityInstitution_institutionId_idx" ON "OpportunityInstitution"("institutionId");

-- CreateIndex
CREATE INDEX "OpportunityApplication_opportunityId_stage_idx" ON "OpportunityApplication"("opportunityId", "stage");

-- CreateIndex
CREATE INDEX "OpportunityApplication_userId_appliedAt_idx" ON "OpportunityApplication"("userId", "appliedAt");

-- CreateIndex
CREATE INDEX "OpportunityApplication_stage_idx" ON "OpportunityApplication"("stage");

-- CreateIndex
CREATE UNIQUE INDEX "OpportunityApplication_userId_opportunityId_key" ON "OpportunityApplication"("userId", "opportunityId");

-- CreateIndex
CREATE INDEX "RoomOpportunity_opportunityId_idx" ON "RoomOpportunity"("opportunityId");

-- CreateIndex
CREATE INDEX "RoomOpportunity_roomId_reason_idx" ON "RoomOpportunity"("roomId", "reason");

-- CreateIndex
CREATE INDEX "HiringPipeline_organizationId_idx" ON "HiringPipeline"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "HiringPipeline_organizationId_name_key" ON "HiringPipeline"("organizationId", "name");

-- CreateIndex
CREATE INDEX "RecruitmentStage_kind_idx" ON "RecruitmentStage"("kind");

-- CreateIndex
CREATE INDEX "RecruitmentStage_pipelineId_order_idx" ON "RecruitmentStage"("pipelineId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "RecruitmentStage_pipelineId_order_key" ON "RecruitmentStage"("pipelineId", "order");

-- CreateIndex
CREATE INDEX "Opportunity_organizationId_idx" ON "Opportunity"("organizationId");

-- CreateIndex
CREATE INDEX "Opportunity_status_deletedAt_category_postedAt_idx" ON "Opportunity"("status", "deletedAt", "category", "postedAt");

-- CreateIndex
CREATE INDEX "Opportunity_category_sector_status_idx" ON "Opportunity"("category", "sector", "status");

-- CreateIndex
CREATE INDEX "Opportunity_recruitmentMethod_status_idx" ON "Opportunity"("recruitmentMethod", "status");

-- CreateIndex
CREATE INDEX "Opportunity_workMode_status_idx" ON "Opportunity"("workMode", "status");

-- CreateIndex
CREATE INDEX "Opportunity_experienceLevel_status_idx" ON "Opportunity"("experienceLevel", "status");

-- CreateIndex
CREATE INDEX "Opportunity_sourceKind_postedAt_idx" ON "Opportunity"("sourceKind", "postedAt");

-- CreateIndex
CREATE INDEX "Opportunity_trustScore_status_idx" ON "Opportunity"("trustScore", "status");

-- CreateIndex
CREATE INDEX "Opportunity_sourceExternalId_idx" ON "Opportunity"("sourceExternalId");

-- CreateIndex
CREATE INDEX "Opportunity_applicationDeadline_idx" ON "Opportunity"("applicationDeadline");

-- CreateIndex
CREATE INDEX "Opportunity_registrationDeadline_idx" ON "Opportunity"("registrationDeadline");

-- CreateIndex
CREATE INDEX "Opportunity_applicantLocationRequirements_idx" ON "Opportunity" USING GIN ("applicantLocationRequirements");

-- CreateIndex
CREATE INDEX "Opportunity_employmentTypes_idx" ON "Opportunity" USING GIN ("employmentTypes");

-- CreateIndex
CREATE INDEX "OpportunityEvent_verification_createdAt_idx" ON "OpportunityEvent"("verification", "createdAt");

-- CreateIndex
CREATE INDEX "OpportunityEvent_authorId_idx" ON "OpportunityEvent"("authorId");

-- CreateIndex
CREATE INDEX "OpportunityEvent_eventType_verification_idx" ON "OpportunityEvent"("eventType", "verification");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_institutionId_key" ON "Organization"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "RawOpportunity_sourceId_sourceExternalId_key" ON "RawOpportunity"("sourceId", "sourceExternalId");

-- CreateIndex
CREATE INDEX "areas_tags_idx" ON "areas" USING GIN ("tags");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_postedByUserId_fkey" FOREIGN KEY ("postedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "HiringPipeline"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityCompensation" ADD CONSTRAINT "OpportunityCompensation_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriveDetails" ADD CONSTRAINT "DriveDetails_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventDetails" ADD CONSTRAINT "EventDetails_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedSearchInstitution" ADD CONSTRAINT "SavedSearchInstitution_savedSearchId_fkey" FOREIGN KEY ("savedSearchId") REFERENCES "SavedSearch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedSearchInstitution" ADD CONSTRAINT "SavedSearchInstitution_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityInstitution" ADD CONSTRAINT "OpportunityInstitution_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityInstitution" ADD CONSTRAINT "OpportunityInstitution_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityApplication" ADD CONSTRAINT "OpportunityApplication_currentStageId_fkey" FOREIGN KEY ("currentStageId") REFERENCES "RecruitmentStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityApplication" ADD CONSTRAINT "OpportunityApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityApplication" ADD CONSTRAINT "OpportunityApplication_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityEvent" ADD CONSTRAINT "OpportunityEvent_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityEvent" ADD CONSTRAINT "OpportunityEvent_verifiedByUserId_fkey" FOREIGN KEY ("verifiedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomOpportunity" ADD CONSTRAINT "RoomOpportunity_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomOpportunity" ADD CONSTRAINT "RoomOpportunity_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomOpportunity" ADD CONSTRAINT "RoomOpportunity_addedByUserId_fkey" FOREIGN KEY ("addedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HiringPipeline" ADD CONSTRAINT "HiringPipeline_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruitmentStage" ADD CONSTRAINT "RecruitmentStage_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "HiringPipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
