-- AlterTable
ALTER TABLE "WalkInDetails" 
ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "clusterName" TEXT,
ADD COLUMN IF NOT EXISTS "city" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WalkInDetails_city_idx" ON "WalkInDetails"("city");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WalkInDetails_clusterName_idx" ON "WalkInDetails"("clusterName");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WalkInDetails_latitude_longitude_idx" ON "WalkInDetails"("latitude", "longitude");
