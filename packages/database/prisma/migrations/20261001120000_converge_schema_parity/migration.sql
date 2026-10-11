-- ============================================================================
-- Converge repair: schema.prisma <-> database parity (written 2026-10-01).
-- This file is the reviewed remainder of `prisma migrate diff` (branch DB with
-- all 44 folder migrations applied --> current schema.prisma), MINUS the two
-- pre-norm backup tables, which are DELIBERATELY KEPT (200+ rows of real backup
-- data; harmless extra objects). A post-apply diff therefore still lists those
-- two tables and nothing else.
-- Vetted destructive parts (prod data, 2026-10-01): alias/canonical/pending
-- tables hold rows (24..870) but have ZERO code references repo-wide (dead
-- pipeline v1 structures); User.passwordHash is empty and unreferenced;
-- ResourceItemType swap touches only YOUTUBE/FILE rows (no GOOGLE_DRIVE).
-- Drops use IF EXISTS so partially-migrated environments do not abort.
-- ============================================================================
-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserStatus') THEN
    CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DEACTIVATED');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RoleType') THEN
    CREATE TYPE "RoleType" AS ENUM ('SUPER_ADMIN', 'MODERATOR');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ActorType') THEN
    CREATE TYPE "ActorType" AS ENUM ('USER', 'SYSTEM', 'WORKER', 'API');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CommentType') THEN
    CREATE TYPE "CommentType" AS ENUM ('GENERAL', 'QUESTION', 'EXPERIENCE', 'UPDATE', 'CORRECTION', 'WARNING', 'REFERRAL');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CommentVoteValue') THEN
    CREATE TYPE "CommentVoteValue" AS ENUM ('UPVOTE', 'DOWNVOTE');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'JobSignalType') THEN
    CREATE TYPE "JobSignalType" AS ENUM ('APPLIED', 'INTERVIEWED', 'OFFER', 'CLOSED', 'HELPFUL', 'INCORRECT');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'JobSubmissionStatus') THEN
    CREATE TYPE "JobSubmissionStatus" AS ENUM ('PUBLISHED', 'MERGED', 'PENDING_REVIEW', 'REJECTED');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReportReason') THEN
    CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'INACCURATE', 'EXPIRED', 'OFFENSIVE', 'OTHER');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReportStatus') THEN
    CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CommunityPostCategory') THEN
    CREATE TYPE "CommunityPostCategory" AS ENUM ('DISCUSSION', 'QUESTION', 'EXPERIENCE', 'INTERVIEW_EXPERIENCE', 'HIRING_UPDATE', 'UPDATE', 'REFERRAL', 'OTHER');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CommunityPostStatus') THEN
    CREATE TYPE "CommunityPostStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'DELETED');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IntroRequestStatus') THEN
    CREATE TYPE "IntroRequestStatus" AS ENUM ('PENDING', 'CONTACTED', 'ARCHIVED');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InterviewResult') THEN
    CREATE TYPE "InterviewResult" AS ENUM ('SELECTED', 'REJECTED', 'WAITING', 'WITHDRAWN');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InterviewDifficulty') THEN
    CREATE TYPE "InterviewDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD', 'VERY_HARD');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ApplicationStatus') THEN
    CREATE TYPE "ApplicationStatus" AS ENUM ('APPLIED', 'ASSESSMENT_RECEIVED', 'ASSESSMENT_COMPLETED', 'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED', 'SELECTED', 'REJECTED', 'WAITING', 'NO_RESPONSE');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReferralRequestStatus') THEN
    CREATE TYPE "ReferralRequestStatus" AS ENUM ('OPEN', 'FULFILLED', 'CLOSED');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SalaryReportType') THEN
    CREATE TYPE "SalaryReportType" AS ENUM ('OFFER', 'CURRENT_CTC');
  END IF;
END $$;

-- AlterEnum
BEGIN;
CREATE TYPE "ResourceItemType_new" AS ENUM ('PDF', 'FILE', 'YOUTUBE', 'WEBSITE', 'ROADMAP', 'LINK');
ALTER TABLE "ResourceItem" ALTER COLUMN "type" TYPE "ResourceItemType_new" USING ("type"::text::"ResourceItemType_new");
ALTER TYPE "ResourceItemType" RENAME TO "ResourceItemType_old";
ALTER TYPE "ResourceItemType_new" RENAME TO "ResourceItemType";
DROP TYPE "public"."ResourceItemType_old";
COMMIT;

-- DropForeignKey
-- Table-existence guard: IF EXISTS covers only the constraint, not the table.
DO $$ BEGIN
  IF to_regclass('public."CompanyAlias"') IS NOT NULL THEN
    ALTER TABLE "CompanyAlias" DROP CONSTRAINT IF EXISTS "CompanyAlias_canonical_company_fkey";
  END IF;
END $$;

-- AlterTable
ALTER TABLE "OpportunityComment" ADD COLUMN     "commentType" "CommentType" NOT NULL DEFAULT 'GENERAL',
ADD COLUMN     "downvotes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "editedAt" TIMESTAMP(3),
ADD COLUMN     "parentCommentId" TEXT,
ADD COLUMN     "upvotes" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "expectedCtc" INTEGER,
ADD COLUMN     "resumeUrl" TEXT,
ADD COLUMN     "willingToRelocate" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ResourceCollection" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "ResourceCollection" RENAME CONSTRAINT "SharedResource_pkey" TO "ResourceCollection_pkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN IF EXISTS "passwordHash",
DROP COLUMN IF EXISTS "provider",
DROP COLUMN IF EXISTS "providerId",
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

-- DropTable
DROP TABLE IF EXISTS "CompanyAlias";

-- DropTable
DROP TABLE IF EXISTS "CompanyCanonical";

-- DropTable
DROP TABLE IF EXISTS "CourseAlias";

-- DropTable
DROP TABLE IF EXISTS "CourseCanonical";

-- DropTable
DROP TABLE IF EXISTS "CoursePending";

-- DropTable
DROP TABLE IF EXISTS "LocationAlias";

-- DropTable
DROP TABLE IF EXISTS "LocationCanonical";

-- DropTable
DROP TABLE IF EXISTS "LocationPending";

-- NOTE: pre-norm backup tables are DELIBERATELY KEPT (see header). They remain
-- as benign extra objects outside the Prisma schema.

-- DropTable
DROP TABLE IF EXISTS "SkillAlias";

-- DropTable
DROP TABLE IF EXISTS "SkillCanonical";

-- DropTable
DROP TABLE IF EXISTS "SkillPending";

-- DropTable
DROP TABLE IF EXISTS "SpecializationAlias";

-- DropTable
DROP TABLE IF EXISTS "SpecializationCanonical";

-- DropTable
DROP TABLE IF EXISTS "SpecializationPending";

-- CreateTable
CREATE TABLE "AccessRole" (
    "id" TEXT NOT NULL,
    "name" "RoleType" NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessRolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "AccessRolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "UserAccessRole" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,

    CONSTRAINT "UserAccessRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "CommentVote" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" "CommentVoteValue" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobSignal" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "signalType" "JobSignalType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobSubmission" (
    "id" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "applyUrl" TEXT,
    "title" TEXT NOT NULL,
    "company" TEXT,
    "description" TEXT,
    "extractedData" JSONB,
    "status" "JobSubmissionStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "submittedById" TEXT NOT NULL,
    "opportunityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "commentId" TEXT,
    "reason" "ReportReason" NOT NULL,
    "message" VARCHAR(1000),
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "actorId" TEXT,
    "opportunityId" TEXT,
    "commentId" TEXT,
    "payload" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntroRequest" (
    "id" TEXT NOT NULL,
    "recruiterId" TEXT,
    "candidateId" TEXT NOT NULL,
    "message" VARCHAR(1000),
    "status" "IntroRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntroRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicProfileView" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "viewerKey" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicProfileView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityPost" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" "CommunityPostCategory" NOT NULL DEFAULT 'DISCUSSION',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "anonId" TEXT,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "commentsCount" INTEGER NOT NULL DEFAULT 0,
    "status" "CommunityPostStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiredAt" TIMESTAMP(3),
    "sourceOpportunityId" TEXT,
    "roomId" TEXT,

    CONSTRAINT "CommunityPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityPostComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "body" TEXT NOT NULL,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "anonId" TEXT,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CommunityPostComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityPostVote" (
    "id" TEXT NOT NULL,
    "postId" TEXT,
    "commentId" TEXT,
    "userId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityPostVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewExperience" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "role" VARCHAR(200) NOT NULL,
    "batch" INTEGER,
    "rounds" JSONB NOT NULL,
    "difficulty" "InterviewDifficulty",
    "result" "InterviewResult",
    "interviewDate" TIMESTAMP(3),
    "overallNotes" TEXT,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "downvotes" INTEGER NOT NULL DEFAULT 0,
    "status" "CommunityPostStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewExperience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewExperienceVote" (
    "id" TEXT NOT NULL,
    "interviewExperienceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewExperienceVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationUpdate" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL,
    "description" TEXT,
    "evidenceUrl" VARCHAR(2000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralRequest" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "company" VARCHAR(120) NOT NULL,
    "role" VARCHAR(120),
    "batch" INTEGER,
    "city" VARCHAR(80),
    "note" VARCHAR(1000),
    "status" "ReferralRequestStatus" NOT NULL DEFAULT 'OPEN',
    "responseCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralResponse" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "responderId" TEXT NOT NULL,
    "message" VARCHAR(1000),
    "contactHandle" VARCHAR(200),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryReport" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "company" VARCHAR(120) NOT NULL,
    "role" VARCHAR(120) NOT NULL,
    "batch" INTEGER,
    "city" VARCHAR(80),
    "reportType" "SalaryReportType" NOT NULL DEFAULT 'OFFER',
    "ctcFixed" INTEGER,
    "ctcVariable" INTEGER,
    "ctcTotal" INTEGER,
    "inHandMonthly" INTEGER,
    "joinBonus" INTEGER,
    "bondMonths" INTEGER,
    "notes" VARCHAR(1000),
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "status" "CommunityPostStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalaryReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryReportHelpful" (
    "id" TEXT NOT NULL,
    "salaryReportId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalaryReportHelpful_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CommunityPostToReport" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CommunityPostToReport_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CommunityPostCommentToReport" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CommunityPostCommentToReport_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccessRole_name_key" ON "AccessRole"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AccessRole_displayName_key" ON "AccessRole"("displayName");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE INDEX "AccessRolePermission_permissionId_idx" ON "AccessRolePermission"("permissionId");

-- CreateIndex
CREATE INDEX "UserAccessRole_roleId_idx" ON "UserAccessRole"("roleId");

-- CreateIndex
CREATE INDEX "CommentVote_userId_idx" ON "CommentVote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CommentVote_commentId_userId_key" ON "CommentVote"("commentId", "userId");

-- CreateIndex
CREATE INDEX "JobSignal_opportunityId_signalType_idx" ON "JobSignal"("opportunityId", "signalType");

-- CreateIndex
CREATE UNIQUE INDEX "JobSignal_opportunityId_userId_signalType_key" ON "JobSignal"("opportunityId", "userId", "signalType");

-- CreateIndex
CREATE INDEX "JobSubmission_sourceUrl_idx" ON "JobSubmission"("sourceUrl");

-- CreateIndex
CREATE INDEX "JobSubmission_submittedById_idx" ON "JobSubmission"("submittedById");

-- CreateIndex
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Report_reporterId_idx" ON "Report"("reporterId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "IntroRequest_candidateId_createdAt_idx" ON "IntroRequest"("candidateId", "createdAt");

-- CreateIndex
CREATE INDEX "IntroRequest_recruiterId_createdAt_idx" ON "IntroRequest"("recruiterId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IntroRequest_recruiterId_candidateId_key" ON "IntroRequest"("recruiterId", "candidateId");

-- CreateIndex
CREATE INDEX "PublicProfileView_profileId_idx" ON "PublicProfileView"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "PublicProfileView_profileId_viewerKey_key" ON "PublicProfileView"("profileId", "viewerKey");

-- CreateIndex
CREATE INDEX "CommunityPost_createdAt_idx" ON "CommunityPost"("createdAt");

-- CreateIndex
CREATE INDEX "CommunityPost_category_idx" ON "CommunityPost"("category");

-- CreateIndex
CREATE INDEX "CommunityPost_status_idx" ON "CommunityPost"("status");

-- CreateIndex
CREATE INDEX "CommunityPost_authorId_idx" ON "CommunityPost"("authorId");

-- CreateIndex
CREATE INDEX "CommunityPost_sourceOpportunityId_idx" ON "CommunityPost"("sourceOpportunityId");

-- CreateIndex
CREATE INDEX "CommunityPost_roomId_idx" ON "CommunityPost"("roomId");

-- CreateIndex
CREATE INDEX "CommunityPost_tags_idx" ON "CommunityPost" USING GIN ("tags");

-- CreateIndex
CREATE INDEX "CommunityPostComment_postId_createdAt_idx" ON "CommunityPostComment"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityPostComment_parentId_idx" ON "CommunityPostComment"("parentId");

-- CreateIndex
CREATE INDEX "CommunityPostComment_authorId_idx" ON "CommunityPostComment"("authorId");

-- CreateIndex
CREATE INDEX "CommunityPostVote_userId_idx" ON "CommunityPostVote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityPostVote_postId_userId_key" ON "CommunityPostVote"("postId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityPostVote_commentId_userId_key" ON "CommunityPostVote"("commentId", "userId");

-- CreateIndex
CREATE INDEX "InterviewExperience_opportunityId_createdAt_idx" ON "InterviewExperience"("opportunityId", "createdAt");

-- CreateIndex
CREATE INDEX "InterviewExperience_authorId_idx" ON "InterviewExperience"("authorId");

-- CreateIndex
CREATE INDEX "InterviewExperience_result_idx" ON "InterviewExperience"("result");

-- CreateIndex
CREATE INDEX "InterviewExperienceVote_userId_idx" ON "InterviewExperienceVote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewExperienceVote_interviewExperienceId_userId_key" ON "InterviewExperienceVote"("interviewExperienceId", "userId");

-- CreateIndex
CREATE INDEX "ApplicationUpdate_opportunityId_createdAt_idx" ON "ApplicationUpdate"("opportunityId", "createdAt");

-- CreateIndex
CREATE INDEX "ApplicationUpdate_authorId_idx" ON "ApplicationUpdate"("authorId");

-- CreateIndex
CREATE INDEX "ApplicationUpdate_status_idx" ON "ApplicationUpdate"("status");

-- CreateIndex
CREATE INDEX "ReferralRequest_company_idx" ON "ReferralRequest"("company");

-- CreateIndex
CREATE INDEX "ReferralRequest_status_createdAt_idx" ON "ReferralRequest"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ReferralRequest_authorId_idx" ON "ReferralRequest"("authorId");

-- CreateIndex
CREATE INDEX "ReferralResponse_responderId_idx" ON "ReferralResponse"("responderId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralResponse_requestId_responderId_key" ON "ReferralResponse"("requestId", "responderId");

-- CreateIndex
CREATE INDEX "SalaryReport_company_idx" ON "SalaryReport"("company");

-- CreateIndex
CREATE INDEX "SalaryReport_opportunityId_idx" ON "SalaryReport"("opportunityId");

-- CreateIndex
CREATE INDEX "SalaryReport_authorId_idx" ON "SalaryReport"("authorId");

-- CreateIndex
CREATE INDEX "SalaryReport_status_createdAt_idx" ON "SalaryReport"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "SalaryReportHelpful_userId_idx" ON "SalaryReportHelpful"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SalaryReportHelpful_salaryReportId_userId_key" ON "SalaryReportHelpful"("salaryReportId", "userId");

-- CreateIndex
CREATE INDEX "_CommunityPostToReport_B_index" ON "_CommunityPostToReport"("B");

-- CreateIndex
CREATE INDEX "_CommunityPostCommentToReport_B_index" ON "_CommunityPostCommentToReport"("B");

-- CreateIndex
CREATE INDEX "OpportunityComment_parentCommentId_idx" ON "OpportunityComment"("parentCommentId");

-- CreateIndex
-- PROD FIX 2026-10-01: RefreshToken.tokenHash carries duplicates in prod
-- (this exact index killed the 2026-05-18 migration the same way). The app
-- issues duplicate hashes, so delete all but one row per hash BEFORE the
-- unique index below: prefer the unrevoked row, then the latest. Affected
-- users keep their newest session; nobody gets locked out. Idempotent.
DELETE FROM "RefreshToken" a
USING "RefreshToken" b
WHERE a."tokenHash" = b."tokenHash"
  AND a."id" <> b."id"
  AND (
    (a."revokedAt" IS NOT NULL AND b."revokedAt" IS NULL)
    OR ((a."revokedAt" IS NULL) = (b."revokedAt" IS NULL) AND (a."createdAt", a."id") < (b."createdAt", b."id"))
  );
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_tokenHash_idx" ON "RefreshToken"("tokenHash");

-- AddForeignKey
ALTER TABLE "AccessRolePermission" ADD CONSTRAINT "AccessRolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "AccessRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessRolePermission" ADD CONSTRAINT "AccessRolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAccessRole" ADD CONSTRAINT "UserAccessRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAccessRole" ADD CONSTRAINT "UserAccessRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "AccessRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityComment" ADD CONSTRAINT "OpportunityComment_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "OpportunityComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentVote" ADD CONSTRAINT "CommentVote_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "OpportunityComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentVote" ADD CONSTRAINT "CommentVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSignal" ADD CONSTRAINT "JobSignal_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSignal" ADD CONSTRAINT "JobSignal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSubmission" ADD CONSTRAINT "JobSubmission_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSubmission" ADD CONSTRAINT "JobSubmission_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "OpportunityComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "OpportunityComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntroRequest" ADD CONSTRAINT "IntroRequest_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntroRequest" ADD CONSTRAINT "IntroRequest_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPost" ADD CONSTRAINT "CommunityPost_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPostComment" ADD CONSTRAINT "CommunityPostComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPostComment" ADD CONSTRAINT "CommunityPostComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPostComment" ADD CONSTRAINT "CommunityPostComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CommunityPostComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPostVote" ADD CONSTRAINT "CommunityPostVote_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPostVote" ADD CONSTRAINT "CommunityPostVote_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "CommunityPostComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPostVote" ADD CONSTRAINT "CommunityPostVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewExperience" ADD CONSTRAINT "InterviewExperience_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewExperience" ADD CONSTRAINT "InterviewExperience_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewExperienceVote" ADD CONSTRAINT "InterviewExperienceVote_interviewExperienceId_fkey" FOREIGN KEY ("interviewExperienceId") REFERENCES "InterviewExperience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewExperienceVote" ADD CONSTRAINT "InterviewExperienceVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationUpdate" ADD CONSTRAINT "ApplicationUpdate_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationUpdate" ADD CONSTRAINT "ApplicationUpdate_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralRequest" ADD CONSTRAINT "ReferralRequest_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralResponse" ADD CONSTRAINT "ReferralResponse_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ReferralRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralResponse" ADD CONSTRAINT "ReferralResponse_responderId_fkey" FOREIGN KEY ("responderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryReport" ADD CONSTRAINT "SalaryReport_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryReport" ADD CONSTRAINT "SalaryReport_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryReportHelpful" ADD CONSTRAINT "SalaryReportHelpful_salaryReportId_fkey" FOREIGN KEY ("salaryReportId") REFERENCES "SalaryReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryReportHelpful" ADD CONSTRAINT "SalaryReportHelpful_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CommunityPostToReport" ADD CONSTRAINT "_CommunityPostToReport_A_fkey" FOREIGN KEY ("A") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CommunityPostToReport" ADD CONSTRAINT "_CommunityPostToReport_B_fkey" FOREIGN KEY ("B") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CommunityPostCommentToReport" ADD CONSTRAINT "_CommunityPostCommentToReport_A_fkey" FOREIGN KEY ("A") REFERENCES "CommunityPostComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CommunityPostCommentToReport" ADD CONSTRAINT "_CommunityPostCommentToReport_B_fkey" FOREIGN KEY ("B") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "SharedResource_company_idx" RENAME TO "ResourceCollection_company_idx";

-- RenameIndex
ALTER INDEX "SharedResource_skills_idx" RENAME TO "ResourceCollection_skills_idx";

-- RenameIndex
ALTER INDEX "SharedResource_status_idx" RENAME TO "ResourceCollection_status_idx";
