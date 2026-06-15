-- CreateEnum
CREATE TYPE "ResourceSector" AS ENUM ('PRIVATE', 'GOVERNMENT');

-- AlterTable
ALTER TABLE "ResourceCollection" ADD COLUMN     "sector" "ResourceSector" NOT NULL DEFAULT 'PRIVATE';

-- CreateIndex
CREATE INDEX "ResourceCollection_sector_idx" ON "ResourceCollection"("sector");
