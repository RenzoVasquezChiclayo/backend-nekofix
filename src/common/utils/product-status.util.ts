import { ProductStatus } from '@prisma/client';

/** Estados visibles en el catálogo público (excluye HIDDEN). */
export const PUBLIC_PRODUCT_STATUSES: ProductStatus[] = [
  ProductStatus.ACTIVE,
  ProductStatus.OUT_OF_STOCK,
];

/**
 * Ajusta el status tras un cambio de stock.
 * No modifica HIDDEN (configurado manualmente por el administrador).
 */
export function resolveStatusAfterStockChange(
  currentStatus: ProductStatus,
  newStock: number,
): ProductStatus | undefined {
  if (currentStatus === ProductStatus.HIDDEN) {
    return undefined;
  }
  if (newStock <= 0) {
    return currentStatus === ProductStatus.OUT_OF_STOCK
      ? undefined
      : ProductStatus.OUT_OF_STOCK;
  }
  if (currentStatus === ProductStatus.OUT_OF_STOCK) {
    return ProductStatus.ACTIVE;
  }
  return undefined;
}

export function buildProductStockUpdateData(
  currentStatus: ProductStatus,
  newStock: number,
): { stock: number; status?: ProductStatus } {
  const data: { stock: number; status?: ProductStatus } = { stock: newStock };
  const status = resolveStatusAfterStockChange(currentStatus, newStock);
  if (status !== undefined) {
    data.status = status;
  }
  return data;
}
