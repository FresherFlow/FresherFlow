-- AlterEnum
ALTER TYPE "OpportunityType" ADD VALUE 'GOVERNMENT';

-- AlterEnum
ALTER TYPE "ResourceItemType" ADD VALUE 'PDF';
ALTER TYPE "ResourceItemType" ADD VALUE 'FILE';

-- RenameTable
ALTER TABLE "SharedResource" RENAME TO "ResourceCollection";

-- AlterTable
ALTER TABLE "ResourceCollection" ADD COLUMN     "description" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
DROP COLUMN "type",
DROP COLUMN "url";

-- CreateTable
CREATE TABLE "ResourceItem" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ResourceItemType" NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResourceItem_collectionId_idx" ON "ResourceItem"("collectionId");

-- AddForeignKey
ALTER TABLE "ResourceItem" ADD CONSTRAINT "ResourceItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "ResourceCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
