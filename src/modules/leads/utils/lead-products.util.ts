import { Prisma } from '@prisma/client';
import { LeadProductItemDto } from '../dto/cart-checkout-lead.dto';

export type LeadProductItem = {
  productId: string;
  name: string;
  slug: string;
  quantity: number;
  price: number;
  storage?: string;
  color?: string;
  condition?: string;
};

export function toLeadProductsJson(
  items: LeadProductItemDto[],
): Prisma.InputJsonValue {
  return items as unknown as Prisma.InputJsonValue;
}

export function parseLeadProducts(productsJson: Prisma.JsonValue): LeadProductItem[] {
  if (!Array.isArray(productsJson)) {
    return [];
  }

  const items: LeadProductItem[] = [];
  for (const raw of productsJson) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const row = raw as Record<string, unknown>;

    const productId = typeof row.productId === 'string' ? row.productId.trim() : '';
    const name = typeof row.name === 'string' ? row.name : '';
    const slug = typeof row.slug === 'string' ? row.slug : '';
    const quantity =
      typeof row.quantity === 'number'
        ? row.quantity
        : typeof row.qty === 'number'
          ? row.qty
          : NaN;
    const price =
      typeof row.price === 'number'
        ? row.price
        : typeof row.unitPrice === 'number'
          ? row.unitPrice
          : NaN;

    if (
      !productId ||
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      continue;
    }

    items.push({
      productId,
      name,
      slug,
      quantity: Math.floor(quantity),
      price,
      storage: typeof row.storage === 'string' ? row.storage : undefined,
      color: typeof row.color === 'string' ? row.color : undefined,
      condition: typeof row.condition === 'string' ? row.condition : undefined,
    });
  }
  return items;
}
