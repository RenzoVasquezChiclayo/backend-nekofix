import { ProductCatalogType } from '@prisma/client';

const DEVICE_CONDITION_NAMES = new Set([
  'nuevo',
  'seminuevo',
  'reacondicionado',
  'refurbished',
  'reparado',
  'repaired',
  'para piezas',
  'for-parts',
  'for parts',
]);

const SPARE_PART_CONDITION_NAMES = new Set([
  'original',
  'oem',
  'genérico',
  'generico',
  'pull',
  'refabricado',
]);

const DEVICE_GRADE_NAMES = new Set(['a+', 'a', 'b', 'c']);

const SPARE_PART_GRADE_NAMES = new Set([
  'original',
  'oem',
  'genérico',
  'generico',
]);

/**
 * Infiere el segmento de catálogo de una condición por nombre o slug.
 * Reglas de negocio Fase 2.1; default DEVICE.
 */
export function resolveConditionCatalogType(
  name: string,
  slug?: string,
): ProductCatalogType {
  const byName = name.trim().toLowerCase();
  const bySlug = slug?.trim().toLowerCase();

  if (
    SPARE_PART_CONDITION_NAMES.has(byName) ||
    (bySlug != null && SPARE_PART_CONDITION_NAMES.has(bySlug))
  ) {
    return ProductCatalogType.SPARE_PART;
  }

  if (
    DEVICE_CONDITION_NAMES.has(byName) ||
    (bySlug != null && DEVICE_CONDITION_NAMES.has(bySlug))
  ) {
    return ProductCatalogType.DEVICE;
  }

  return ProductCatalogType.DEVICE;
}

/**
 * Infiere el segmento de catálogo de un grado por nombre.
 * Grades A+/A/B/C → DEVICE; Original/OEM/Genérico → SPARE_PART; default DEVICE.
 */
export function resolveGradeCatalogType(name: string): ProductCatalogType {
  const normalized = name.trim().toLowerCase();
  if (SPARE_PART_GRADE_NAMES.has(normalized)) {
    return ProductCatalogType.SPARE_PART;
  }
  if (DEVICE_GRADE_NAMES.has(normalized)) {
    return ProductCatalogType.DEVICE;
  }
  return ProductCatalogType.DEVICE;
}
