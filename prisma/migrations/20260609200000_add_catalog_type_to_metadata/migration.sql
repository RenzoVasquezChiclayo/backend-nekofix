-- AlterTable: product_conditions_catalog — columna aditiva con default seguro
ALTER TABLE "product_conditions_catalog" ADD COLUMN "catalogType" "ProductCatalogType" NOT NULL DEFAULT 'DEVICE';

-- Backfill condiciones SPARE_PART por nombre/slug
UPDATE "product_conditions_catalog"
SET "catalogType" = 'SPARE_PART'
WHERE LOWER("name") IN ('original', 'oem', 'genérico', 'generico', 'pull', 'refabricado')
   OR LOWER("slug") IN ('original', 'oem', 'generico', 'pull', 'refabricado');

-- Backfill condiciones DEVICE explícitas (resto permanece DEVICE por default)
UPDATE "product_conditions_catalog"
SET "catalogType" = 'DEVICE'
WHERE LOWER("name") IN ('nuevo', 'seminuevo', 'reacondicionado', 'refurbished', 'reparado', 'para piezas')
   OR LOWER("slug") IN ('new', 'seminuevo', 'refurbished', 'repaired', 'for-parts');

-- AlterTable: product_grades_catalog — columna aditiva con default seguro
ALTER TABLE "product_grades_catalog" ADD COLUMN "catalogType" "ProductCatalogType" NOT NULL DEFAULT 'DEVICE';

-- Backfill grades SPARE_PART
UPDATE "product_grades_catalog"
SET "catalogType" = 'SPARE_PART'
WHERE LOWER("name") IN ('original', 'oem', 'genérico', 'generico');

-- Backfill grades DEVICE
UPDATE "product_grades_catalog"
SET "catalogType" = 'DEVICE'
WHERE LOWER("name") IN ('a+', 'a', 'b', 'c');

-- Reemplazar unicidad global por unicidad compuesta (slug/name + catalogType)
DROP INDEX IF EXISTS "product_conditions_catalog_slug_key";
CREATE UNIQUE INDEX "product_conditions_catalog_slug_catalogType_key" ON "product_conditions_catalog"("slug", "catalogType");
CREATE INDEX "product_conditions_catalog_catalogType_idx" ON "product_conditions_catalog"("catalogType");

DROP INDEX IF EXISTS "product_grades_catalog_name_key";
CREATE UNIQUE INDEX "product_grades_catalog_name_catalogType_key" ON "product_grades_catalog"("name", "catalogType");
CREATE INDEX "product_grades_catalog_catalogType_idx" ON "product_grades_catalog"("catalogType");
