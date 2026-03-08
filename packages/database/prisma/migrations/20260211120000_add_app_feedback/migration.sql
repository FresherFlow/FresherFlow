-- CreateEnum
CREATE TYPE "AppFeedbackType" AS ENUM ('BUG', 'IDEA', 'PRAISE', 'OTHER');

-- CreateTable
CREATE TABLE "AppFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AppFeedbackType" NOT NULL,
    "rating" INTEGER,
    "message" TEXT NOT NULL,
    "pageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppFeedback_type_idx" ON "AppFeedback"("type");

-- CreateIndex
CREATE INDEX "AppFeedback_createdAt_idx" ON "AppFeedback"("createdAt");

-- AddForeignKey
ALTER TABLE "AppFeedback" ADD CONSTRAINT "AppFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
