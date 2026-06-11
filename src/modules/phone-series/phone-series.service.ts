import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createPaginatedResponse } from '../../common/utils/paginated-response';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePhoneSeriesDto } from './dto/create-phone-series.dto';
import { QueryPhoneSeriesDto } from './dto/query-phone-series.dto';
import { UpdatePhoneSeriesDto } from './dto/update-phone-series.dto';

@Injectable()
export class PhoneSeriesService {
  private static readonly seriesInclude = {
    brand: { select: { id: true, name: true, slug: true, logo: true } },
    _count: { select: { models: true, products: true } },
  } as const;

  private readonly logger = new Logger(PhoneSeriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryPhoneSeriesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';

    const where: Prisma.PhoneSeriesWhereInput = {
      ...(query.brandId ? { brandId: query.brandId } : {}),
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

    const orderBy: Prisma.PhoneSeriesOrderByWithRelationInput =
      sortBy === 'name' ? { name: sortOrder } : { createdAt: sortOrder };

    const [rows, total] = await Promise.all([
      this.prisma.phoneSeries.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        include: PhoneSeriesService.seriesInclude,
      }),
      this.prisma.phoneSeries.count({ where }),
    ]);

    return createPaginatedResponse(rows, page, limit, total);
  }

  async findOne(id: string) {
    const series = await this.prisma.phoneSeries.findUnique({
      where: { id },
      include: PhoneSeriesService.seriesInclude,
    });
    if (!series) {
      this.logger.warn(`Serie no encontrada por ID: ${id}`);
      throw new NotFoundException('Serie no encontrada');
    }
    return series;
  }

  async create(dto: CreatePhoneSeriesDto) {
    await this.ensureBrandExists(dto.brandId);
    await this.ensureSlugAvailable(dto.slug);

    return this.prisma.phoneSeries.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        isActive: dto.isActive ?? true,
        brandId: dto.brandId,
      },
      include: PhoneSeriesService.seriesInclude,
    });
  }

  async update(id: string, dto: UpdatePhoneSeriesDto) {
    await this.ensureExists(id);
    if (dto.brandId) await this.ensureBrandExists(dto.brandId);
    if (dto.slug) await this.ensureSlugAvailable(dto.slug, id);

    return this.prisma.phoneSeries.update({
      where: { id },
      data: dto,
      include: PhoneSeriesService.seriesInclude,
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);

    const [products, models] = await Promise.all([
      this.prisma.product.count({ where: { seriesId: id } }),
      this.prisma.phoneModel.count({ where: { seriesId: id } }),
    ]);

    if (products > 0 || models > 0) {
      throw new BadRequestException(
        'No se puede eliminar la serie porque está asociada a productos o modelos.',
      );
    }

    await this.prisma.phoneSeries.delete({ where: { id } });
    return { id };
  }

  private async ensureExists(id: string) {
    const row = await this.prisma.phoneSeries.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!row) {
      throw new NotFoundException('Serie no encontrada');
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
    const existing = await this.prisma.phoneSeries.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (existing && existing.id !== currentId) {
      throw new BadRequestException('Ya existe una serie con ese slug.');
    }
  }
}
