import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { createPaginatedResponse } from '../../common/utils/paginated-response';
import { resolveLegacyBrandCategoryModelFilters } from '../../common/utils/resolve-legacy-admin-filters';
import {
  serializeProduct,
  serializeProducts,
} from '../../common/utils/serialize-json';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  normalizeProductColor,
  normalizeProductColorHex,
} from '../../common/utils/product-color.util';
import { normalizeProductImagesForWrite } from './utils/product-images.util';
import {
  resolveGradeForCreate,
  resolveGradeForUpdate,
} from './utils/product-grade.util';
import { resolveCatalogTypeForCreate } from './utils/product-catalog-type.util';
import { assertCategoryMatchesProductCatalogType } from './utils/product-category.util';
import { assertProductMetadataMatchesCatalogType } from './utils/product-metadata.util';
import {
  PUBLIC_PRODUCT_STATUSES,
  resolveStatusAfterStockChange,
} from '../../common/utils/product-status.util';

const productInclude = {
  brand: true,
  category: true,
  model: true,
  series: {
    include: {
      brand: { select: { id: true, name: true, slug: true, logo: true } },
    },
  },
  conditionRef: true,
  gradeRef: true,
  productImages: {
    orderBy: { sortOrder: 'asc' as const },
  },
} as const;


@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: QueryProductDto,
    options: { includeUnpublished: boolean },
  ) {
    /** Catálogo público: 12 por página. Admin (borradores): 20 por defecto. */
    const defaultLimit = options.includeUnpublished ? 20 : 12;
    const rawPage = query.page ?? 1;
    const rawLimit = query.limit ?? defaultLimit;
    const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
    const limit = Number.isFinite(rawLimit) && rawLimit >= 1 && rawLimit <= 100
      ? Math.floor(rawLimit)
      : defaultLimit;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';

    const featured =
      query.featured !== undefined
        ? query.featured
        : query.isFeatured;

    const filters = await resolveLegacyBrandCategoryModelFilters(this.prisma, {
      brandId: query.brandId,
      brand: query.brand,
      categoryId: query.categoryId,
      category: query.category,
      modelId: query.modelId,
      model: query.model,
    });

    const where: Prisma.ProductWhereInput = {
      ...(!options.includeUnpublished
        ? {
            isPublished: true,
            status: { in: PUBLIC_PRODUCT_STATUSES },
          }
        : {}),
      ...(options.includeUnpublished && query.status
        ? { status: query.status }
        : {}),
      ...(query.id ? { id: query.id } : {}),
      ...(filters.legacySlugNotFound ? { id: { in: [] } } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.brandId ? { brandId: filters.brandId } : {}),
      ...(filters.modelId ? { modelId: filters.modelId } : {}),
      ...(query.condition ? { condition: query.condition } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.catalogType
        ? { catalogType: query.catalogType }
        : query.excludeCatalogType
          ? { catalogType: { not: query.excludeCatalogType } }
          : {}),
      ...(query.grade ? { grade: query.grade } : {}),
      ...(featured !== undefined
        ? { isFeatured: featured }
        : {}),
      ...(query.search
        ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
            { sku: { contains: query.search, mode: 'insensitive' } },
          ],
        }
        : {}),
    };

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      sortBy === 'price' ? { price: sortOrder } : { createdAt: sortOrder };

    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        include: productInclude,
      }),
      this.prisma.product.count({ where }),
    ]);

    const data = serializeProducts(
      rows as unknown as Record<string, unknown>[],
    );

    return createPaginatedResponse(data, page, limit, total);
  }

  async findFeatured() {
    const rows = await this.prisma.product.findMany({
      where: {
        isFeatured: true,
        isPublished: true,
        status: { in: PUBLIC_PRODUCT_STATUSES },
      },
      orderBy: { createdAt: 'desc' },
      include: productInclude,
    });
    return serializeProducts(rows as unknown as Record<string, unknown>[]);
  }

  async findBySlug(slug: string, options: { includeUnpublished: boolean }) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: productInclude,
    });
    if (!product) {
      this.logger.warn(`Producto no encontrado por slug: ${slug}`);
      throw new NotFoundException('Producto no encontrado');
    }
    if (!this.isPubliclyVisible(product, options.includeUnpublished)) {
      this.logger.warn(
        `Producto ${product.id} no visible en catálogo público: acceso por slug denegado`,
      );
      throw new NotFoundException('Producto no encontrado');
    }
    return serializeProduct(product as unknown as Record<string, unknown>);
  }

  /**
   * Detalle por id (admin y catálogo cuando el segmento de ruta es UUID).
   * Respeta visibilidad de borradores igual que findBySlug.
   */
  async findOne(id: string, options: { includeUnpublished: boolean }) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: productInclude,
    });
    if (!product) {
      this.logger.warn(`Producto no encontrado por ID: ${id}`);
      throw new NotFoundException('Producto no encontrado');
    }
    if (!this.isPubliclyVisible(product, options.includeUnpublished)) {
      this.logger.warn(
        `Producto no encontrado por ID (no visible sin JWT admin): ${id}`,
      );
      throw new NotFoundException('Producto no encontrado');
    }
    return serializeProduct(product as unknown as Record<string, unknown>);
  }

  async create(dto: CreateProductDto) {
    const { images, ...data } = dto;
    const normalized = images?.length
      ? normalizeProductImagesForWrite(images)
      : [];

    const grade = resolveGradeForCreate(data.type, data.grade);
    const catalogType = resolveCatalogTypeForCreate(
      data.catalogType,
      data.type,
    );
    const category = await this.requireCategory(data.categoryId);
    assertCategoryMatchesProductCatalogType(category, catalogType);
    await assertProductMetadataMatchesCatalogType(this.prisma, catalogType, {
      conditionId: data.conditionId,
      gradeId: data.gradeId,
    });
    if (data.seriesId) {
      await this.requireSeries(data.seriesId);
    }
    const color = normalizeProductColor(data.color);
    const colorHex = normalizeProductColorHex(data.colorHex);

    const created = await this.prisma.product.create({
      data: {
        name: data.name,
        slug: data.slug,
        sku: data.sku,
        description: data.description,
        price: data.price,
        comparePrice: data.comparePrice,
        type: data.type,
        catalogType,
        condition: data.condition,
        conditionId: data.conditionId ?? undefined,
        stock: data.stock ?? 0,
        minStock: data.minStock ?? 0,
        brandId: data.brandId,
        categoryId: data.categoryId,
        modelId: data.modelId,
        seriesId: data.seriesId ?? undefined,
        storage: data.storage,
        color,
        colorHex,
        batteryHealth: data.batteryHealth,
        grade,
        gradeId: data.gradeId ?? undefined,
        isFeatured: data.isFeatured ?? false,
        isPublished: data.isPublished ?? false,
        status: data.status ?? ProductStatus.ACTIVE,
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
        productImages: normalized.length
          ? {
            create: normalized.map((img) => ({
              url: img.url,
              alt: img.alt,
              sortOrder: img.sortOrder,
              isPrimary: img.isPrimary,
            })),
          }
          : undefined,
      },
      include: productInclude,
    });

    return serializeProduct(created as unknown as Record<string, unknown>);
  }

  async update(id: string, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      this.logger.warn(`Producto no encontrado por ID: ${id}`);
      throw new NotFoundException('Producto no encontrado');
    }

    const {
      images,
      grade: gradeFromDto,
      conditionId: conditionIdFromDto,
      gradeId: gradeIdFromDto,
      seriesId: seriesIdFromDto,
      color: colorFromDto,
      colorHex: colorHexFromDto,
      stock: stockFromDto,
      status: statusFromDto,
      ...rest
    } = dto;
    const gradeSent = Object.prototype.hasOwnProperty.call(dto, 'grade');
    const conditionIdSent = Object.prototype.hasOwnProperty.call(
      dto,
      'conditionId',
    );
    const gradeIdSent = Object.prototype.hasOwnProperty.call(dto, 'gradeId');
    const seriesIdSent = Object.prototype.hasOwnProperty.call(dto, 'seriesId');
    const colorSent = Object.prototype.hasOwnProperty.call(dto, 'color');
    const colorHexSent = Object.prototype.hasOwnProperty.call(dto, 'colorHex');
    const stockSent = Object.prototype.hasOwnProperty.call(dto, 'stock');
    const statusSent = Object.prototype.hasOwnProperty.call(dto, 'status');
    const nextType = dto.type ?? existing.type;
    const catalogTypeSent = Object.prototype.hasOwnProperty.call(
      dto,
      'catalogType',
    );
    const nextCatalogType = catalogTypeSent
      ? resolveCatalogTypeForCreate(dto.catalogType, nextType)
      : existing.catalogType;
    const categoryIdSent = Object.prototype.hasOwnProperty.call(
      dto,
      'categoryId',
    );
    const nextCategoryId = categoryIdSent ? dto.categoryId! : existing.categoryId;
    if (categoryIdSent || catalogTypeSent) {
      const category = await this.requireCategory(nextCategoryId);
      assertCategoryMatchesProductCatalogType(category, nextCatalogType);
    }
    const nextConditionId = conditionIdSent
      ? conditionIdFromDto
      : existing.conditionId;
    const nextGradeId = gradeIdSent ? gradeIdFromDto : existing.gradeId;
    const nextSeriesId = seriesIdSent ? seriesIdFromDto : existing.seriesId;

    if (catalogTypeSent || conditionIdSent || gradeIdSent) {
      await assertProductMetadataMatchesCatalogType(
        this.prisma,
        nextCatalogType,
        {
          conditionId: nextConditionId,
          gradeId: nextGradeId,
        },
      );
    }
    if (seriesIdSent && nextSeriesId) {
      await this.requireSeries(nextSeriesId);
    }
    const mergedGrade = resolveGradeForUpdate(
      nextType,
      gradeFromDto,
      existing.grade,
      gradeSent,
    );

    const nextStock = stockSent ? stockFromDto! : existing.stock;
    let resolvedStatus = statusSent ? statusFromDto : existing.status;
    if (stockSent && !statusSent) {
      const autoStatus = resolveStatusAfterStockChange(
        existing.status,
        nextStock,
      );
      if (autoStatus !== undefined) {
        resolvedStatus = autoStatus;
      }
    }

    const data: Prisma.ProductUpdateInput = {
      ...(rest as Prisma.ProductUpdateInput),
      grade: mergedGrade,
      ...(stockSent ? { stock: nextStock } : {}),
      ...(statusSent || (stockSent && resolvedStatus !== existing.status)
        ? { status: resolvedStatus }
        : {}),
      ...(conditionIdSent ? { conditionId: conditionIdFromDto } : {}),
      ...(gradeIdSent ? { gradeId: gradeIdFromDto } : {}),
      ...(seriesIdSent ? { seriesId: seriesIdFromDto } : {}),
      ...(colorSent ? { color: normalizeProductColor(colorFromDto) } : {}),
      ...(colorHexSent
        ? { colorHex: normalizeProductColorHex(colorHexFromDto) }
        : {}),
    };

    if (images === undefined) {
      const updated = await this.prisma.product.update({
        where: { id },
        data,
        include: productInclude,
      });
      return serializeProduct(updated as unknown as Record<string, unknown>);
    }

    const normalized = images.length
      ? normalizeProductImagesForWrite(images)
      : [];

    await this.prisma.$transaction(async (tx) => {
      await tx.productImage.deleteMany({ where: { productId: id } });
      await tx.product.update({
        where: { id },
        data,
      });
      if (normalized.length) {
        await tx.productImage.createMany({
          data: normalized.map((img) => ({
            productId: id,
            url: img.url,
            alt: img.alt,
            sortOrder: img.sortOrder,
            isPrimary: img.isPrimary,
          })),
        });
      }
    });

    const updated = await this.prisma.product.findUniqueOrThrow({
      where: { id },
      include: productInclude,
    });
    return serializeProduct(updated as unknown as Record<string, unknown>);
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.product.delete({ where: { id } });
    return { id };
  }

  private async requireSeries(seriesId: string) {
    const series = await this.prisma.phoneSeries.findUnique({
      where: { id: seriesId },
      select: { id: true },
    });
    if (!series) {
      throw new BadRequestException('La serie indicada no existe.');
    }
  }

  private async requireCategory(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true, name: true, catalogType: true },
    });
    if (!category) {
      throw new BadRequestException('La categoría indicada no existe.');
    }
    return category;
  }

  private isPubliclyVisible(
    product: { isPublished: boolean; status: ProductStatus },
    includeUnpublished: boolean,
  ): boolean {
    if (includeUnpublished) {
      return true;
    }
    if (!product.isPublished) {
      return false;
    }
    return PUBLIC_PRODUCT_STATUSES.includes(product.status);
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) {
      this.logger.warn(`Producto no encontrado por ID: ${id}`);
      throw new NotFoundException('Producto no encontrado');
    }
  }
}
