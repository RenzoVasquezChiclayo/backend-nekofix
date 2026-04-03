import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createPaginatedResponse } from '../../common/utils/paginated-response';
import { resolveLegacyBrandCategoryModelFilters } from '../../common/utils/resolve-legacy-admin-filters';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePhoneModelDto } from './dto/create-phone-model.dto';
import { QueryPhoneModelDto } from './dto/query-phone-model.dto';
import { UpdatePhoneModelDto } from './dto/update-phone-model.dto';

@Injectable()
export class PhoneModelsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryPhoneModelDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';

    const filters = await resolveLegacyBrandCategoryModelFilters(this.prisma, {
      brandId: query.brandId,
      brand: query.brand,
    });

    const where: Prisma.PhoneModelWhereInput = {
      ...(filters.legacySlugNotFound ? { id: { in: [] } } : {}),
      ...(filters.brandId ? { brandId: filters.brandId } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { slug: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.PhoneModelOrderByWithRelationInput =
      sortBy === 'name' ? { name: sortOrder } : { createdAt: sortOrder };

    const [rows, total] = await Promise.all([
      this.prisma.phoneModel.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        include: {
          brand: {
            select: { id: true, name: true, slug: true, logo: true },
          },
        },
      }),
      this.prisma.phoneModel.count({ where }),
    ]);

    return createPaginatedResponse(rows, page, limit, total);
  }

  async findOne(id: string) {
    const model = await this.prisma.phoneModel.findUnique({
      where: { id },
      include: {
        brand: {
          select: { id: true, name: true, slug: true, logo: true },
        },
      },
    });

    if (!model) {
      throw new NotFoundException('Modelo de telùfono no encontrado');
    }

    return model;
  }

  async create(dto: CreatePhoneModelDto) {
    await this.ensureBrandExists(dto.brandId);
    await this.ensureSlugAvailable(dto.slug);

    return this.prisma.phoneModel.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        brandId: dto.brandId,
      },
      include: {
        brand: {
          select: { id: true, name: true, slug: true, logo: true },
        },
      },
    });
  }

  async update(id: string, dto: UpdatePhoneModelDto) {
    await this.ensureExists(id);

    if (dto.brandId) {
      await this.ensureBrandExists(dto.brandId);
    }

    if (dto.slug) {
      await this.ensureSlugAvailable(dto.slug, id);
    }

    return this.prisma.phoneModel.update({
      where: { id },
      data: dto,
      include: {
        brand: {
          select: { id: true, name: true, slug: true, logo: true },
        },
      },
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);

    const relatedProducts = await this.prisma.product.count({
      where: { modelId: id },
    });

    if (relatedProducts > 0) {
      throw new BadRequestException(
        'No se puede eliminar el modelo porque estù asociado a productos.',
      );
    }

    try {
      await this.prisma.phoneModel.delete({ where: { id } });
      return { id };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(
          'No se puede eliminar el modelo porque tiene relaciones activas.',
        );
      }
      throw error;
    }
  }

  private async ensureExists(id: string) {
    const model = await this.prisma.phoneModel.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!model) {
      throw new NotFoundException('Modelo de telùfono no encontrado');
    }
  }

  private async ensureBrandExists(brandId: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id: brandId },
      select: { id: true },
    });

    if (!brand) {
      throw new BadRequestException('La marca indicada no existe');
    }
  }

  private async ensureSlugAvailable(slug: string, currentId?: string) {
    const existing = await this.prisma.phoneModel.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existing && existing.id !== currentId) {
      throw new ConflictException('Ya existe un modelo con ese slug');
    }
  }
}
