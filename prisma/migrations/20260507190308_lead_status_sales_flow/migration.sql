/*
  Warnings:

  - Added the required column `updatedAt` to the `Lead` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('PENDING', 'CONTACTED', 'SOLD', 'CANCELLED');

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "confirmedById" TEXT,
ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "soldAt" TIMESTAMP(3),
ADD COLUMN     "status" "LeadStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
