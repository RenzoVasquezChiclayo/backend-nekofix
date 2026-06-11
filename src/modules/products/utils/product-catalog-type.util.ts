import { ProductCatalogType, ProductType } from '@prisma/client';

/**
 * Resuelve `catalogType` al crear un producto.
 * Si el cliente no envía el campo (compat. panel legacy), se infiere de `type`:
 * - ACCESSORY → ACCESSORY
 * - resto → DEVICE
 */
export function resolveCatalogTypeForCreate(
  catalogType: ProductCatalogType | undefined,
  type: ProductType,
): ProductCatalogType {
  if (catalogType != null) {
    return catalogType;
  }
  if (type === ProductType.ACCESSORY) {
    return ProductCatalogType.ACCESSORY;
  }
  return ProductCatalogType.DEVICE;
}
