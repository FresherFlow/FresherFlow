-- Launch-risk indexes: per-detail-view UserAction counts, CommunityPost tag filtering, AlertDelivery history scans.
-- Trigram title/body search intentionally NOT included (requires pg_trgm extension; follow-up).
CREATE INDEX IF NOT EXISTS "UserAction_opportunityId_actionType_idx" ON "UserAction"("opportunityId", "actionType");

CREATE INDEX IF NOT EXISTS "CommunityPost_tags_idx" ON "CommunityPost" USING GIN ("tags");

CREATE INDEX IF NOT EXISTS "AlertDelivery_userId_channel_sentAt_idx" ON "AlertDelivery"("userId", "channel", "sentAt");
