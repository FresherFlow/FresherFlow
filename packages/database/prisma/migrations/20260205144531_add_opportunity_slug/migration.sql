-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "OpportunityType" AS ENUM ('JOB', 'INTERNSHIP', 'WALKIN');

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('APPLIED', 'PLANNING', 'ATTENDED', 'NOT_ELIGIBLE');

-- CreateEnum
CREATE TYPE "FeedbackReason" AS ENUM ('EXPIRED', 'LINK_BROKEN', 'DUPLICATE', 'INACCURATE');

-- CreateEnum
CREATE TYPE "EducationLevel" AS ENUM ('DIPLOMA', 'DEGREE', 'PG');

-- CreateEnum
CREATE TYPE "WorkMode" AS ENUM ('ONSITE', 'HYBRID', 'REMOTE');

-- CreateEnum
CREATE TYPE "SalaryPeriod" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "Availability" AS ENUM ('IMMEDIATE', 'DAYS_15', 'MONTH_1');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "fullName" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "provider" TEXT DEFAULT 'credentials',
    "providerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "educationLevel" "EducationLevel",
    "tenthYear" INTEGER,
    "twelfthYear" INTEGER,
    "gradCourse" TEXT,
    "gradSpecialization" TEXT,
    "gradYear" INTEGER,
    "pgCourse" TEXT,
    "pgSpecialization" TEXT,
    "pgYear" INTEGER,
    "interestedIn" "OpportunityType"[],
    "preferredCities" TEXT[],
    "workModes" "WorkMode"[],
    "availability" "Availability",
    "skills" TEXT[],
    "completionPercentage" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAudit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "OpportunityType" NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "description" TEXT,
    "allowedDegrees" "EducationLevel"[],
    "allowedCourses" TEXT[],
    "allowedPassoutYears" INTEGER[],
    "passoutYearMin" INTEGER,
    "passoutYearMax" INTEGER,
    "allowedAvailability" "Availability"[],
    "requiredSkills" TEXT[],
    "locations" TEXT[],
    "experienceMin" INTEGER,
    "experienceMax" INTEGER,
    "workMode" "WorkMode",
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "salaryRange" TEXT,
    "salaryPeriod" "SalaryPeriod" NOT NULL DEFAULT 'YEARLY',
    "incentives" TEXT,
    "jobFunction" TEXT,
    "stipend" TEXT,
    "employmentType" TEXT,
    "applyLink" TEXT,
    "expiresAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "status" "OpportunityStatus" NOT NULL DEFAULT 'DRAFT',
    "deletedAt" TIMESTAMP(3),
    "deletionReason" TEXT,
    "postedByUserId" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVerified" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalkInDetails" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "dates" TIMESTAMP(3)[],
    "dateRange" TEXT,
    "timeRange" TEXT,
    "venueAddress" TEXT NOT NULL,
    "venueLink" TEXT,
    "reportingTime" TEXT NOT NULL,
    "requiredDocuments" TEXT[],
    "contactPerson" TEXT,
    "contactPhone" TEXT,

    CONSTRAINT "WalkInDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "actionType" "ActionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "reason" "FeedbackReason" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE INDEX "AdminAudit_userId_idx" ON "AdminAudit"("userId");

-- CreateIndex
CREATE INDEX "AdminAudit_action_idx" ON "AdminAudit"("action");

-- CreateIndex
CREATE INDEX "AdminAudit_createdAt_idx" ON "AdminAudit"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_slug_key" ON "Opportunity"("slug");

-- CreateIndex
CREATE INDEX "Opportunity_status_idx" ON "Opportunity"("status");

-- CreateIndex
CREATE INDEX "Opportunity_type_idx" ON "Opportunity"("type");

-- CreateIndex
CREATE INDEX "Opportunity_locations_idx" ON "Opportunity"("locations");

-- CreateIndex
CREATE INDEX "Opportunity_expiresAt_idx" ON "Opportunity"("expiresAt");

-- CreateIndex
CREATE INDEX "Opportunity_deletedAt_idx" ON "Opportunity"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WalkInDetails_opportunityId_key" ON "WalkInDetails"("opportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAction_userId_opportunityId_key" ON "UserAction"("userId", "opportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "ListingFeedback_userId_opportunityId_key" ON "ListingFeedback"("userId", "opportunityId");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAudit" ADD CONSTRAINT "AdminAudit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_postedByUserId_fkey" FOREIGN KEY ("postedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalkInDetails" ADD CONSTRAINT "WalkInDetails_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAction" ADD CONSTRAINT "UserAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAction" ADD CONSTRAINT "UserAction_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingFeedback" ADD CONSTRAINT "ListingFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingFeedback" ADD CONSTRAINT "ListingFeedback_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
