-- AlterTable: columna con default seguro para categorías existentes
ALTER TABLE "Category" ADD COLUMN "catalogType" "ProductCatalogType" NOT NULL DEFAULT 'DEVICE';

-- Backfill: inferir catalogType desde los productos de cada categoría (mayoría)
WITH "category_catalog" AS (
  SELECT
    "categoryId",
    "catalogType",
    COUNT(*) AS "product_count"
  FROM "Product"
  GROUP BY "categoryId", "catalogType"
),
"ranked" AS (
  SELECT
    "categoryId",
    "catalogType",
    ROW_NUMBER() OVER (
      PARTITION BY "categoryId"
      ORDER BY "product_count" DESC, "catalogType" ASC
    ) AS "rn"
  FROM "category_catalog"
)
UPDATE "Category" c
SET "catalogType" = r."catalogType"
FROM "ranked" r
WHERE c."id" = r."categoryId" AND r."rn" = 1;

-- CreateIndex
CREATE INDEX "Category_catalogType_idx" ON "Category"("catalogType");
