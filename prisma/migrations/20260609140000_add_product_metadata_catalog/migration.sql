-- CreateTable: PhoneSeries
CREATE TABLE "PhoneSeries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "brandId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhoneSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable: product_conditions_catalog (no usar "ProductCondition": conflicto con enum legacy)
CREATE TABLE "product_conditions_catalog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_conditions_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable: product_grades_catalog
CREATE TABLE "product_grades_catalog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_grades_catalog_pkey" PRIMARY KEY ("id")
);

-- AlterTable: PhoneModel — serie opcional
ALTER TABLE "PhoneModel" ADD COLUMN "seriesId" TEXT;

-- AlterTable: Product — relaciones opcionales (campos legacy intactos)
ALTER TABLE "Product" ADD COLUMN "conditionId" TEXT;
ALTER TABLE "Product" ADD COLUMN "gradeId" TEXT;
ALTER TABLE "Product" ADD COLUMN "seriesId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PhoneSeries_slug_key" ON "PhoneSeries"("slug");
CREATE INDEX "PhoneSeries_brandId_idx" ON "PhoneSeries"("brandId");
CREATE INDEX "PhoneSeries_isActive_idx" ON "PhoneSeries"("isActive");

CREATE UNIQUE INDEX "product_conditions_catalog_slug_key" ON "product_conditions_catalog"("slug");
CREATE INDEX "product_conditions_catalog_isActive_idx" ON "product_conditions_catalog"("isActive");

CREATE UNIQUE INDEX "product_grades_catalog_name_key" ON "product_grades_catalog"("name");
CREATE INDEX "product_grades_catalog_isActive_idx" ON "product_grades_catalog"("isActive");

CREATE INDEX "PhoneModel_seriesId_idx" ON "PhoneModel"("seriesId");
CREATE INDEX "Product_conditionId_idx" ON "Product"("conditionId");
CREATE INDEX "Product_gradeId_idx" ON "Product"("gradeId");
CREATE INDEX "Product_seriesId_idx" ON "Product"("seriesId");

-- AddForeignKey
ALTER TABLE "PhoneSeries" ADD CONSTRAINT "PhoneSeries_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PhoneModel" ADD CONSTRAINT "PhoneModel_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "PhoneSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Product" ADD CONSTRAINT "Product_conditionId_fkey" FOREIGN KEY ("conditionId") REFERENCES "product_conditions_catalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "product_grades_catalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "PhoneSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
