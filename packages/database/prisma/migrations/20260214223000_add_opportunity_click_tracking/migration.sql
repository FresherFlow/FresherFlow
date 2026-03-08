-- Track real apply-link clicks for opportunity-level conversion analytics
CREATE TABLE "OpportunityClick" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'unknown',
    "targetUrl" TEXT,
    "referrer" TEXT,
    "userAgent" TEXT,
    "ipHash" TEXT,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpportunityClick_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OpportunityClick_createdAt_idx" ON "OpportunityClick"("createdAt");
CREATE INDEX "OpportunityClick_opportunityId_createdAt_idx" ON "OpportunityClick"("opportunityId", "createdAt");
CREATE INDEX "OpportunityClick_isInternal_createdAt_idx" ON "OpportunityClick"("isInternal", "createdAt");
CREATE INDEX "OpportunityClick_userId_createdAt_idx" ON "OpportunityClick"("userId", "createdAt");
CREATE INDEX "OpportunityClick_sessionId_createdAt_idx" ON "OpportunityClick"("sessionId", "createdAt");

ALTER TABLE "OpportunityClick" ADD CONSTRAINT "OpportunityClick_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OpportunityClick" ADD CONSTRAINT "OpportunityClick_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
