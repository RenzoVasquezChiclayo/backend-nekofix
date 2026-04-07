import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InventoryMovementType } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { createPaginatedResponse } from '../../common/utils/paginated-response';
import { isUuidString } from '../../common/utils/is-uuid-string';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryMoveDto } from './dto/inventory-move.dto';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async move(dto: InventoryMoveDto, adminId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) {
      this.logger.warn(
        `Movimiento de inventario: Producto no encontrado por ID: ${dto.productId}`,
      );
      throw new NotFoundException('Producto no encontrado');
    }

    const previousStock = product.stock;
    const newStock = this.computeNewStock(
      dto.type,
      previousStock,
      dto.quantity,
    );

    const movement = await this.prisma.$transaction(async (tx) => {
      const created = await tx.inventoryMovement.create({
        data: {
          productId: dto.productId,
          type: dto.type,
          quantity: dto.quantity,
          previousStock,
          newStock,
          notes: dto.notes,
          createdById: adminId,
        },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true, role: true },
          },
          product: {
            select: { id: true, name: true, sku: true, slug: true },
          },
        },
      });

      await tx.product.update({
        where: { id: dto.productId },
        data: { stock: newStock },
      });

      return created;
    });

    return movement;
  }

  private computeNewStock(
    type: InventoryMovementType,
    previousStock: number,
    quantity: number,
  ): number {
    switch (type) {
      case InventoryMovementType.IN:
      case InventoryMovementType.RETURN:
        return previousStock + quantity;
      case InventoryMovementType.OUT:
      case InventoryMovementType.SALE:
        if (quantity > previousStock) {
          throw new BadRequestException('Stock insuficiente para esta salida');
        }
        return previousStock - quantity;
      case InventoryMovementType.ADJUSTMENT:
        if (quantity < 0) {
          throw new BadRequestException(
            'El stock ajustado no puede ser negativo',
          );
        }
        return quantity;
      default:
        throw new BadRequestException('Tipo de movimiento no soportado');
    }
  }

  async history(productIdOrSlug: string, query: PaginationQueryDto) {
    const segment = productIdOrSlug.trim();
    let product = await this.prisma.product.findUnique({
      where: { id: segment },
      select: { id: true },
    });
    if (!product) {
      product = await this.prisma.product.findUnique({
        where: { slug: segment },
        select: { id: true },
      });
      if (product && !isUuidString(segment)) {
        this.logger.warn(
          `Historial de inventario resuelto por slug; en admin usar UUID de producto (segmento=${segment})`,
        );
      }
    }
    if (!product) {
      const hint = isUuidString(segment)
        ? 'UUID sin coincidencia en base de datos'
        : 'ni id ni slug coinciden';
      this.logger.warn(
        `Historial de inventario: producto no encontrado (${hint}): ${segment}`,
      );
      throw new NotFoundException('Producto no encontrado');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = { productId: product.id };

    const [rows, total] = await Promise.all([
      this.prisma.inventoryMovement.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      }),
      this.prisma.inventoryMovement.count({ where }),
    ]);

    return createPaginatedResponse(rows, page, limit, total);
  }
}
