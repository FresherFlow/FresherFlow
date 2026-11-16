-- Keep OAuth access and refresh tokens bound to the exact MCP resource.
-- Empty defaults make pre-migration tokens fail closed until the user reconnects.
ALTER TABLE "OAuthAccessToken"
ADD COLUMN "resource" TEXT NOT NULL DEFAULT '';

ALTER TABLE "OAuthRefreshToken"
ADD COLUMN "resource" TEXT NOT NULL DEFAULT '';
