import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProductCondition, ProductType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { createPaginatedResponse } from '../../common/utils/paginated-response';
import {
  serializeProduct,
  serializeProducts,
} from '../../common/utils/serialize-json';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const productInclude = {
  brand: true,
  category: true,
  model: true,
} as const;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: QueryProductDto,
    options: { includeUnpublished: boolean },
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';

    const where: Prisma.ProductWhereInput = {
      ...(!options.includeUnpublished ? { isPublished: true } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.brandId ? { brandId: query.brandId } : {}),
      ...(query.condition ? { condition: query.condition } : {}),
      ...(query.type ? { type: query.type } : {}),
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
      throw new NotFoundException('Producto no encontrado');
    }
    if (!product.isPublished && !options.includeUnpublished) {
      throw new NotFoundException('Producto no encontrado');
    }
    return serializeProduct(product as unknown as Record<string, unknown>);
  }

  async create(dto: CreateProductDto) {
    const created = await this.prisma.product.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        sku: dto.sku,
        description: dto.description,
        price: dto.price,
        comparePrice: dto.comparePrice,
        type: dto.type,
        condition: dto.condition,
        stock: dto.stock ?? 0,
        minStock: dto.minStock ?? 0,
        brandId: dto.brandId,
        categoryId: dto.categoryId,
        modelId: dto.modelId,
        storage: dto.storage,
        color: dto.color,
        batteryHealth: dto.batteryHealth,
        grade: dto.grade,
        isFeatured: dto.isFeatured ?? false,
        isPublished: dto.isPublished ?? false,
        seoTitle: dto.seoTitle,
        seoDescription: dto.seoDescription,
      },
      include: productInclude,
    });
    return serializeProduct(created as unknown as Record<string, unknown>);
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.ensureExists(id);
    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...dto,
      },
      include: productInclude,
    });
    return serializeProduct(updated as unknown as Record<string, unknown>);
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.product.delete({ where: { id } });
    return { id };
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('Producto no encontrado');
    }
  }
}
