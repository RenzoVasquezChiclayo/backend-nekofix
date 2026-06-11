-- CreateEnum
CREATE TYPE "ProductCatalogType" AS ENUM ('DEVICE', 'SPARE_PART', 'ACCESSORY');

-- AlterTable: columna con default seguro para filas existentes
ALTER TABLE "Product" ADD COLUMN "catalogType" "ProductCatalogType" NOT NULL DEFAULT 'DEVICE';

-- Backfill: accesorios existentes (type = ACCESSORY) → catalogType = ACCESSORY
UPDATE "Product" SET "catalogType" = 'ACCESSORY' WHERE "type" = 'ACCESSORY';

-- CreateIndex
CREATE INDEX "Product_catalogType_idx" ON "Product"("catalogType");
