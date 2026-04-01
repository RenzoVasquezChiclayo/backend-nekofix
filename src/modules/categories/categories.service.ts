import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createPaginatedResponse } from '../../common/utils/paginated-response';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { QueryCategoryDto } from './dto/query-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryCategoryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';

    const where: Prisma.CategoryWhereInput = {
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

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
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
      },
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id);
    return this.prisma.category.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.category.delete({ where: { id } });
    return { id };
  }
}
