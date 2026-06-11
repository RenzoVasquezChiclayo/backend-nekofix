import { BadRequestException } from '@nestjs/common';
import { ProductCatalogType } from '@prisma/client';

/**
 * Valida que la categoría pertenezca al mismo segmento de catálogo que el producto.
 */
export function assertCategoryMatchesProductCatalogType(
  category: { id: string; name: string; catalogType: ProductCatalogType },
  productCatalogType: ProductCatalogType,
): void {
  if (category.catalogType === productCatalogType) {
    return;
  }
  throw new BadRequestException(
    `La categoría "${category.name}" pertenece al catálogo ${category.catalogType} y no es compatible con un producto ${productCatalogType}.`,
  );
}
