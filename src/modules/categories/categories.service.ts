import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProductCatalogType } from '@prisma/client';
import { createPaginatedResponse } from '../../common/utils/paginated-response';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { QueryCategoryDto } from './dto/query-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryCategoryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';

    const exactSlug = query.slug?.trim() || query.category?.trim();

    const where: Prisma.CategoryWhereInput = {
      ...(exactSlug ? { slug: exactSlug } : {}),
      ...(query.catalogType ? { catalogType: query.catalogType } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { slug: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.CategoryOrderByWithRelationInput =
      sortBy === 'name' ? { name: sortOrder } : { createdAt: sortOrder };

    const [rows, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
      }),
      this.prisma.category.count({ where }),
    ]);

    return createPaginatedResponse(rows, page, limit, total);
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({ where: { slug } });
    if (!category) {
      this.logger.warn(`Categoría no encontrada por slug: ${slug}`);
      throw new NotFoundException('Categoría no encontrada');
    }
    return category;
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      this.logger.warn(`Categoría no encontrada por ID: ${id}`);
      throw new NotFoundException('Categoría no encontrada');
    }
    return category;
  }

  create(dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        icon: dto.icon,
        catalogType: dto.catalogType ?? ProductCatalogType.DEVICE,
      },
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const existing = await this.findOne(id);
    if (dto.catalogType != null && dto.catalogType !== existing.catalogType) {
      await this.assertNoCatalogTypeConflict(id, dto.catalogType);
    }
    return this.prisma.category.update({
      where: { id },
      data: dto,
    });
  }

  /** Impide cambiar catalogType si hay productos de otro segmento en la categoría. */
  private async assertNoCatalogTypeConflict(
    categoryId: string,
    nextCatalogType: ProductCatalogType,
  ) {
    const conflicting = await this.prisma.product.findFirst({
      where: {
        categoryId,
        catalogType: { not: nextCatalogType },
      },
      select: { id: true, name: true, catalogType: true },
    });
    if (conflicting) {
      throw new BadRequestException(
        `No se puede cambiar el catálogo de la categoría: el producto "${conflicting.name}" (${conflicting.catalogType}) no es compatible con ${nextCatalogType}.`,
      );
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.category.delete({ where: { id } });
    return { id };
  }
}
