-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'OUT_OF_STOCK', 'HIDDEN');

-- AlterTable: default ACTIVE para filas existentes (no destructivo)
ALTER TABLE "Product" ADD COLUMN "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "Product_status_idx" ON "Product"("status");
