/** #RGB o #RRGGBB (mayúsculas/minúsculas). */
export const PRODUCT_COLOR_HEX_PATTERN =
  /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

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

/**
 * Normaliza `Product.colorHex` (#RGB → #RRGGBB en mayúsculas).
 * Vacío o inválido → `null`.
 */
export function normalizeProductColorHex(
  raw: string | null | undefined,
): string | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  if (!PRODUCT_COLOR_HEX_PATTERN.test(trimmed)) return null;

  if (trimmed.length === 4) {
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }

  return trimmed.toUpperCase();
}
