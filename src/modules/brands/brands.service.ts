import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createPaginatedResponse } from '../../common/utils/paginated-response';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { QueryBrandDto } from './dto/query-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryBrandDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';

    const where: Prisma.BrandWhereInput = {
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { slug: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.BrandOrderByWithRelationInput =
      sortBy === 'name' ? { name: sortOrder } : { createdAt: sortOrder };

    const [rows, total] = await Promise.all([
      this.prisma.brand.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
      }),
      this.prisma.brand.count({ where }),
    ]);

    return createPaginatedResponse(rows, page, limit, total);
  }

  async findOne(id: string) {
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) {
      throw new NotFoundException('Marca no encontrada');
    }
    return brand;
  }

  create(dto: CreateBrandDto) {
    return this.prisma.brand.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        logo: dto.logo,
      },
    });
  }

  async update(id: string, dto: UpdateBrandDto) {
    await this.findOne(id);
    return this.prisma.brand.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.brand.delete({ where: { id } });
    return { id };
  }
}
