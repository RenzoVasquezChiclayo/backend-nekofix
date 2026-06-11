import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProductCatalogType } from '@prisma/client';
import { createPaginatedResponse } from '../../common/utils/paginated-response';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductConditionDto } from './dto/create-product-condition.dto';
import { QueryProductConditionDto } from './dto/query-product-condition.dto';
import { UpdateProductConditionDto } from './dto/update-product-condition.dto';

@Injectable()
export class ProductConditionsService {
  private readonly logger = new Logger(ProductConditionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryProductConditionDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'sortOrder';
    const sortOrder = query.sortOrder ?? 'asc';

    const where: Prisma.ProductConditionCatalogWhereInput = {
      ...(query.catalogType ? { catalogType: query.catalogType } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { slug: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.ProductConditionCatalogOrderByWithRelationInput =
      sortBy === 'name'
        ? { name: sortOrder }
        : sortBy === 'createdAt'
          ? { createdAt: sortOrder }
          : { sortOrder: sortOrder };

    const [rows, total] = await Promise.all([
      this.prisma.productConditionCatalog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
      }),
      this.prisma.productConditionCatalog.count({ where }),
    ]);

    return createPaginatedResponse(rows, page, limit, total);
  }

  async findOne(id: string) {
    const row = await this.prisma.productConditionCatalog.findUnique({
      where: { id },
    });
    if (!row) {
      this.logger.warn(`Condición no encontrada por ID: ${id}`);
      throw new NotFoundException('Condición no encontrada');
    }
    return row;
  }

  async create(dto: CreateProductConditionDto) {
    await this.ensureSlugAvailable(dto.slug, dto.catalogType);

    return this.prisma.productConditionCatalog.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        catalogType: dto.catalogType,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateProductConditionDto) {
    const existing = await this.findOne(id);
    const nextCatalogType = dto.catalogType ?? existing.catalogType;
    const nextSlug = dto.slug ?? existing.slug;

    if (dto.slug || dto.catalogType) {
      await this.ensureSlugAvailable(nextSlug, nextCatalogType, id);
    }

    if (
      dto.catalogType != null &&
      dto.catalogType !== existing.catalogType
    ) {
      await this.assertNoCatalogTypeConflict(id, dto.catalogType);
    }

    return this.prisma.productConditionCatalog.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);

    const related = await this.prisma.product.count({
      where: { conditionId: id },
    });
    if (related > 0) {
      throw new BadRequestException(
        'No se puede eliminar la condición porque está asociada a productos.',
      );
    }

    await this.prisma.productConditionCatalog.delete({ where: { id } });
    return { id };
  }

  private async assertNoCatalogTypeConflict(
    conditionId: string,
    nextCatalogType: ProductCatalogType,
  ) {
    const conflicting = await this.prisma.product.findFirst({
      where: {
        conditionId,
        catalogType: { not: nextCatalogType },
      },
      select: { id: true, name: true, catalogType: true },
    });
    if (conflicting) {
      throw new BadRequestException(
        `No se puede cambiar el catálogo de la condición: el producto "${conflicting.name}" (${conflicting.catalogType}) no es compatible con ${nextCatalogType}.`,
      );
    }
  }

  private async ensureExists(id: string) {
    const row = await this.prisma.productConditionCatalog.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!row) {
      throw new NotFoundException('Condición no encontrada');
    }
  }

  private async ensureSlugAvailable(
    slug: string,
    catalogType: ProductCatalogType,
    currentId?: string,
  ) {
    const existing = await this.prisma.productConditionCatalog.findUnique({
      where: { slug_catalogType: { slug, catalogType } },
      select: { id: true },
    });
    if (existing && existing.id !== currentId) {
      throw new BadRequestException(
        'Ya existe una condición con ese slug en este catálogo.',
      );
    }
  }
}
