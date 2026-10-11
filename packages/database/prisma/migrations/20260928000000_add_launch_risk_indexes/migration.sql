-- Launch-risk indexes: per-detail-view UserAction counts, CommunityPost tag filtering, AlertDelivery history scans.
-- Trigram title/body search intentionally NOT included (requires pg_trgm extension; follow-up).
CREATE INDEX IF NOT EXISTS "UserAction_opportunityId_actionType_idx" ON "UserAction"("opportunityId", "actionType");

-- PROD FIX 2026-10-01: CommunityPost was never created in prod (its creating
-- migration never landed; it arrives with the converge repair migration). A
-- missing table still aborts CREATE INDEX IF NOT EXISTS, so skip when absent;
-- the repair creates this same index alongside the table.
DO $$ BEGIN
  IF to_regclass('public."CommunityPost"') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS "CommunityPost_tags_idx" ON "CommunityPost" USING GIN ("tags");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "AlertDelivery_userId_channel_sentAt_idx" ON "AlertDelivery"("userId", "channel", "sentAt");
