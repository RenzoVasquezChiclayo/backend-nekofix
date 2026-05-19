-- AlterTable: color visual opcional para productos (compatibilidad con `color` existente)
ALTER TABLE "Product" ADD COLUMN "colorHex" TEXT;
