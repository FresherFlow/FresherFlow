-- NotificationType.REFERRAL_RESPONSE: a company answering a fresher's referral request.
-- Previously written as COMMENT_REPLY, which rendered in the UI as "Someone replied to your comment".
-- The values that Prisma already had but packages/types was missing (INTRO_REQUEST, CAMPUS_DRIVE_MATCH,
-- REGISTRATION_OPEN, REGISTRATION_CLOSING, OPPORTUNITY_APPLIED, APPLICATION_STAGE_CHANGED) needed no
-- change here; the schema already declared them.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REFERRAL_RESPONSE';
