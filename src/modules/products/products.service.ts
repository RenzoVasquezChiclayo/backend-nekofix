import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createPaginatedResponse } from '../../common/utils/paginated-response';
import {
  serializeProduct,
  serializeProducts,
} from '../../common/utils/serialize-json';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { normalizeProductImagesForWrite } from './utils/product-images.util';

const productInclude = {
  brand: true,
  category: true,
  model: true,
  productImages: {
    orderBy: { sortOrder: 'asc' as const },
  },
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

  /** Detalle por id (misma forma que findBySlug; útil para admin / futuras rutas). */
  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: productInclude,
    });
    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }
    return serializeProduct(product as unknown as Record<string, unknown>);
  }

  async create(dto: CreateProductDto) {
    const { images, ...data } = dto;
    const normalized = images?.length
      ? normalizeProductImagesForWrite(images)
      : [];

    const created = await this.prisma.product.create({
      data: {
        name: data.name,
        slug: data.slug,
        sku: data.sku,
        description: data.description,
        price: data.price,
        comparePrice: data.comparePrice,
        type: data.type,
        condition: data.condition,
        stock: data.stock ?? 0,
        minStock: data.minStock ?? 0,
        brandId: data.brandId,
        categoryId: data.categoryId,
        modelId: data.modelId,
        storage: data.storage,
        color: data.color,
        batteryHealth: data.batteryHealth,
        grade: data.grade,
        isFeatured: data.isFeatured ?? false,
        isPublished: data.isPublished ?? false,
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
    await this.ensureExists(id);
    const { images, ...rest } = dto;

    if (images === undefined) {
      const updated = await this.prisma.product.update({
        where: { id },
        data: rest as Prisma.ProductUpdateInput,
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
        data: rest as Prisma.ProductUpdateInput,
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
