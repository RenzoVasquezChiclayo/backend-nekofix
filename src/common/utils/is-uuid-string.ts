/**
 * Detecta un identificador con forma UUID (8-4-4-4-12 hex).
 * Versión permisiva: acepta cualquier variante generada por BD/ORM (p. ej. v4, nil),
 * para no enviar por error el segmento a resolución por slug.
 */
const UUID_LIKE_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuidString(value: string): boolean {
  return UUID_LIKE_REGEX.test(value.trim());
}
