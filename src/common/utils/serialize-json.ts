import { Decimal } from '@prisma/client/runtime/library';

export function decimalToNumber(
  value: Decimal | null | undefined,
): number | null {
  if (value == null) return null;
  return value.toNumber();
}

export function serializeProduct<T extends Record<string, unknown>>(
  product: T,
): T {
  const p = { ...product } as Record<string, unknown>;
  if (p.price != null) p.price = decimalToNumber(p.price as Decimal);
  if (p.comparePrice != null)
    p.comparePrice = decimalToNumber(p.comparePrice as Decimal);
  return p as T;
}

export function serializeProducts<T extends Record<string, unknown>>(
  items: T[],
): T[] {
  return items.map((item) => serializeProduct(item));
}
