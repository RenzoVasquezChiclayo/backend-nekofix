import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProductCatalogType } from '@prisma/client';
import { createPaginatedResponse } from '../../common/utils/paginated-response';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductGradeDto } from './dto/create-product-grade.dto';
import { QueryProductGradeDto } from './dto/query-product-grade.dto';
import { UpdateProductGradeDto } from './dto/update-product-grade.dto';

@Injectable()
export class ProductGradesService {
  private readonly logger = new Logger(ProductGradesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryProductGradeDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'sortOrder';
    const sortOrder = query.sortOrder ?? 'asc';

    const where: Prisma.ProductGradeWhereInput = {
      ...(query.catalogType ? { catalogType: query.catalogType } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.ProductGradeOrderByWithRelationInput =
      sortBy === 'name'
        ? { name: sortOrder }
        : sortBy === 'createdAt'
          ? { createdAt: sortOrder }
          : { sortOrder: sortOrder };

    const [rows, total] = await Promise.all([
      this.prisma.productGrade.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
      }),
      this.prisma.productGrade.count({ where }),
    ]);

    return createPaginatedResponse(rows, page, limit, total);
  }

  async findOne(id: string) {
    const row = await this.prisma.productGrade.findUnique({ where: { id } });
    if (!row) {
      this.logger.warn(`Grado no encontrado por ID: ${id}`);
      throw new NotFoundException('Grado no encontrado');
    }
    return row;
  }

  async create(dto: CreateProductGradeDto) {
    await this.ensureNameAvailable(dto.name, dto.catalogType);

    return this.prisma.productGrade.create({
      data: {
        name: dto.name,
        description: dto.description,
        catalogType: dto.catalogType,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateProductGradeDto) {
    const existing = await this.findOne(id);
    const nextCatalogType = dto.catalogType ?? existing.catalogType;
    const nextName = dto.name ?? existing.name;

    if (dto.name || dto.catalogType) {
      await this.ensureNameAvailable(nextName, nextCatalogType, id);
    }

    if (
      dto.catalogType != null &&
      dto.catalogType !== existing.catalogType
    ) {
      await this.assertNoCatalogTypeConflict(id, dto.catalogType);
    }

    return this.prisma.productGrade.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);

    const related = await this.prisma.product.count({ where: { gradeId: id } });
    if (related > 0) {
      throw new BadRequestException(
        'No se puede eliminar el grado porque está asociado a productos.',
      );
    }

    await this.prisma.productGrade.delete({ where: { id } });
    return { id };
  }

  private async assertNoCatalogTypeConflict(
    gradeId: string,
    nextCatalogType: ProductCatalogType,
  ) {
    const conflicting = await this.prisma.product.findFirst({
      where: {
        gradeId,
        catalogType: { not: nextCatalogType },
      },
      select: { id: true, name: true, catalogType: true },
    });
    if (conflicting) {
      throw new BadRequestException(
        `No se puede cambiar el catálogo del grado: el producto "${conflicting.name}" (${conflicting.catalogType}) no es compatible con ${nextCatalogType}.`,
      );
    }
  }

  private async ensureExists(id: string) {
    const row = await this.prisma.productGrade.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!row) {
      throw new NotFoundException('Grado no encontrado');
    }
  }

  private async ensureNameAvailable(
    name: string,
    catalogType: ProductCatalogType,
    currentId?: string,
  ) {
    const existing = await this.prisma.productGrade.findUnique({
      where: { name_catalogType: { name, catalogType } },
      select: { id: true },
    });
    if (existing && existing.id !== currentId) {
      throw new ConflictException(
        `Ya existe un grado "${name}" en el catálogo ${catalogType}.`,
      );
    }
  }
}
