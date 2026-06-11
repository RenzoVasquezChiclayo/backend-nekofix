/**
 * Dominio de catálogo NekoFix — extensión incremental para repuestos.
 *
 * `ProductCatalogType` segmenta el catálogo para el frontend:
 * - DEVICE     → /catalogo (equipos: smartphones nuevos, seminuevos)
 * - SPARE_PART → /repuestos (pantallas, baterías, flex, ICs…)
 * - ACCESSORY  → accesorios (cases, cables, cargadores, micas)
 *
 * `ProductType` (NEW | USED | ACCESSORY) permanece como clasificación comercial
 * y no debe reutilizarse para repuestos.
 *
 * Metadatos administrables (Fase 2.1):
 * - PhoneSeries / Product.seriesId
 * - ProductConditionCatalog → tabla `product_conditions_catalog` / Product.conditionId (+ enum legacy `condition`)
 *   Segmentado por `catalogType` (DEVICE vs SPARE_PART).
 * - ProductGrade / Product.gradeId (+ string legacy `grade`)
 *   Segmentado por `catalogType`; repuestos pueden usar grades de calidad de pieza.
 *
 * --- Fase futura ---
 *
 * ProductCustomAttribute
 *   Atributos dinámicos según catalogType (repuestos: tipo de pieza, compatibilidad…).
 *   Relación: ProductCustomAttribute.productId
 *
 * Al implementar, añadir modelos en prisma/schema.prisma y migraciones incrementales
 * sin alterar el contrato actual de la API de productos.
 */

export { ProductCatalogType } from '@prisma/client';
