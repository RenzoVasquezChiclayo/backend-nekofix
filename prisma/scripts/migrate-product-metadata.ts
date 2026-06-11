/**
 * Migra metadatos legacy de productos a tablas administrables.
 * Idempotente: puede ejecutarse varias veces sin duplicar registros.
 *
 * Uso: npm run migrate:product-metadata
 */
import { PrismaClient, ProductCondition } from '@prisma/client';
import {
  resolveConditionCatalogType,
  resolveGradeCatalogType,
} from '../../src/common/utils/catalog-metadata.util';

const prisma = new PrismaClient();

const CONDITION_ENUM_META: Record<
  ProductCondition,
  { slug: string; name: string; sortOrder: number }
> = {
  [ProductCondition.NEW]: { slug: 'new', name: 'Nuevo', sortOrder: 0 },
  [ProductCondition.SEMINUEVO]: {
    slug: 'seminuevo',
    name: 'Seminuevo',
    sortOrder: 1,
  },
  [ProductCondition.REFURBISHED]: {
    slug: 'refurbished',
    name: 'Reacondicionado',
    sortOrder: 2,
  },
  [ProductCondition.REPAIRED]: {
    slug: 'repaired',
    name: 'Reparado',
    sortOrder: 3,
  },
  [ProductCondition.FOR_PARTS]: {
    slug: 'for-parts',
    name: 'Para piezas',
    sortOrder: 4,
  },
};

function normalizeGradeName(raw: string): string {
  const t = raw.trim().toUpperCase();
  if (t === 'A+') return 'A+';
  return t;
}

async function migrateConditions(): Promise<
  Map<string, Map<ProductCondition, string>>
> {
  /** catalogType → enum → conditionId */
  const catalogEnumToId = new Map<
    string,
    Map<ProductCondition, string>
  >();

  for (const enumValue of Object.values(ProductCondition)) {
    const meta = CONDITION_ENUM_META[enumValue];
    const catalogType = resolveConditionCatalogType(meta.name, meta.slug);

    const row = await prisma.productConditionCatalog.upsert({
      where: {
        slug_catalogType: { slug: meta.slug, catalogType },
      },
      update: {
        name: meta.name,
        sortOrder: meta.sortOrder,
        catalogType,
      },
      create: {
        name: meta.name,
        slug: meta.slug,
        sortOrder: meta.sortOrder,
        catalogType,
        isActive: true,
      },
    });

    if (!catalogEnumToId.has(catalogType)) {
      catalogEnumToId.set(catalogType, new Map());
    }
    catalogEnumToId.get(catalogType)!.set(enumValue, row.id);
  }

  /** Asignar catalogType a registros existentes sin reescribir legacy */
  const allConditions = await prisma.productConditionCatalog.findMany();
  for (const condition of allConditions) {
    const inferred = resolveConditionCatalogType(condition.name, condition.slug);
    if (condition.catalogType !== inferred) {
      await prisma.productConditionCatalog.update({
        where: { id: condition.id },
        data: { catalogType: inferred },
      });
    }
  }

  const products = await prisma.product.findMany({
    select: { id: true, condition: true, catalogType: true, conditionId: true },
  });

  let linked = 0;
  for (const product of products) {
    const enumMap = catalogEnumToId.get(product.catalogType);
    const conditionId = enumMap?.get(product.condition);
    if (!conditionId || product.conditionId === conditionId) {
      continue;
    }
    await prisma.product.update({
      where: { id: product.id },
      data: { conditionId },
    });
    linked += 1;
  }

  // eslint-disable-next-line no-console
  console.log(
    `Conditions: ${allConditions.length} registros revisados, ${linked} productos vinculados.`,
  );
  return catalogEnumToId;
}

async function migrateGrades(): Promise<void> {
  const distinctGrades = await prisma.product.findMany({
    where: { grade: { not: null } },
    select: { grade: true },
    distinct: ['grade'],
  });

  const gradeToId = new Map<string, string>();

  for (const row of distinctGrades) {
    if (!row.grade) continue;
    const name = normalizeGradeName(row.grade);
    const catalogType = resolveGradeCatalogType(name);

    const grade = await prisma.productGrade.upsert({
      where: { name_catalogType: { name, catalogType } },
      update: { catalogType },
      create: {
        name,
        catalogType,
        sortOrder: 0,
        isActive: true,
      },
    });
    gradeToId.set(`${catalogType}:${name}`, grade.id);
  }

  /** Reasignar catalogType en grades existentes */
  const allGrades = await prisma.productGrade.findMany();
  for (const grade of allGrades) {
    const inferred = resolveGradeCatalogType(grade.name);
    if (grade.catalogType !== inferred) {
      await prisma.productGrade.update({
        where: { id: grade.id },
        data: { catalogType: inferred },
      });
    }
  }

  const products = await prisma.product.findMany({
    where: { grade: { not: null } },
    select: { id: true, grade: true, catalogType: true, gradeId: true },
  });

  let linked = 0;
  for (const product of products) {
    if (!product.grade) continue;
    const name = normalizeGradeName(product.grade);
    const gradeId = gradeToId.get(`${product.catalogType}:${name}`);
    if (!gradeId || product.gradeId === gradeId) {
      continue;
    }
    await prisma.product.update({
      where: { id: product.id },
      data: { gradeId },
    });
    linked += 1;
  }

  // eslint-disable-next-line no-console
  console.log(
    `Grades: ${allGrades.length} registros revisados, ${linked} productos vinculados.`,
  );
}

async function main() {
  // eslint-disable-next-line no-console
  console.log('--- migrate:product-metadata ---');
  await migrateConditions();
  await migrateGrades();
  // eslint-disable-next-line no-console
  console.log('Series: sin migración automática (seriesId permanece null).');
  // eslint-disable-next-line no-console
  console.log('--- migración completada ---');
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
