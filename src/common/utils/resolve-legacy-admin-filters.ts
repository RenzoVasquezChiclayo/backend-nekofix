import { PrismaService } from '../../prisma/prisma.service';

/** Entrada para productos: IDs preferidos; slugs solo si falta el ID. */
export type LegacyBrandCategoryModelInput = {
  brandId?: string;
  brand?: string;
  categoryId?: string;
  category?: string;
  modelId?: string;
  model?: string;
};

/**
 * Resuelve filtros admin: prioriza `*Id` sobre slugs legacy (`brand`, `category`, `model`).
 * Consultas Prisma solo cuando hace falta resolver un slug.
 */
export async function resolveLegacyBrandCategoryModelFilters(
  prisma: PrismaService,
  input: LegacyBrandCategoryModelInput,
): Promise<{
  brandId?: string;
  categoryId?: string;
  modelId?: string;
  legacySlugNotFound: boolean;
}> {
  const idBrand = input.brandId?.trim();
  const idCategory = input.categoryId?.trim();
  const idModel = input.modelId?.trim();

  const needBrandSlug = !idBrand && !!input.brand?.trim();
  const needCategorySlug = !idCategory && !!input.category?.trim();
  const needModelSlug = !idModel && !!input.model?.trim();

  if (!needBrandSlug && !needCategorySlug && !needModelSlug) {
    return {
      brandId: idBrand,
      categoryId: idCategory,
      modelId: idModel,
      legacySlugNotFound: false,
    };
  }

  const brandSlug = input.brand?.trim() ?? '';
  const categorySlug = input.category?.trim() ?? '';
  const modelSlug = input.model?.trim() ?? '';

  const [brandRow, categoryRow, modelRow] = await Promise.all([
    needBrandSlug
      ? prisma.brand.findUnique({
          where: { slug: brandSlug },
          select: { id: true },
        })
      : null,
    needCategorySlug
      ? prisma.category.findUnique({
          where: { slug: categorySlug },
          select: { id: true },
        })
      : null,
    needModelSlug
      ? prisma.phoneModel.findUnique({
          where: { slug: modelSlug },
          select: { id: true },
        })
      : null,
  ]);

  let legacySlugNotFound = false;
  let brandId = idBrand;
  let categoryId = idCategory;
  let modelId = idModel;

  if (needBrandSlug) {
    if (!brandRow) legacySlugNotFound = true;
    else brandId = brandRow.id;
  }
  if (needCategorySlug) {
    if (!categoryRow) legacySlugNotFound = true;
    else categoryId = categoryRow.id;
  }
  if (needModelSlug) {
    if (!modelRow) legacySlugNotFound = true;
    else modelId = modelRow.id;
  }

  return {
    brandId,
    categoryId,
    modelId,
    legacySlugNotFound,
  };
}
