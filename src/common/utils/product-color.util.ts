/**
 * Normaliza `Product.color` para UI (círculos de color tipo tienda oficial):
 * trim, espacios múltiples → uno, título legible por palabra.
 * Vacío → `null`.
 */
export function normalizeProductColor(
  raw: string | null | undefined,
): string | null {
  if (raw == null) return null;
  const collapsed = String(raw).trim().replace(/\s+/g, ' ');
  if (collapsed === '') return null;
  return collapsed
    .split(' ')
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join(' ');
}
