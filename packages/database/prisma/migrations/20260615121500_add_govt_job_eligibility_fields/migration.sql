-- CreateEnum
CREATE TYPE "ReservationCategory" AS ENUM ('GENERAL', 'OBC', 'SC', 'ST', 'EWS');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "dob" TIMESTAMP(3),
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "category" "ReservationCategory",
ADD COLUMN     "isPwBD" BOOLEAN DEFAULT false,
ADD COLUMN     "isExServicemen" BOOLEAN DEFAULT false,
ADD COLUMN     "homeState" TEXT;
