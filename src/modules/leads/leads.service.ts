import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InventoryMovementType, LeadStatus, Prisma } from '@prisma/client';
import { buildProductStockUpdateData } from '../../common/utils/product-status.util';
import { ConfigService } from '@nestjs/config';
import { createPaginatedResponse } from '../../common/utils/paginated-response';
import { PrismaService } from '../../prisma/prisma.service';
import { CartCheckoutLeadDto } from './dto/cart-checkout-lead.dto';
import { QueryLeadDto } from './dto/query-lead.dto';
import { parseLeadProducts, toLeadProductsJson } from './utils/lead-products.util';
import { serializeLead, serializeLeads } from './utils/serialize-lead.util';

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async findAll(query: QueryLeadDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = query.search?.trim();
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';
    const where: Prisma.LeadWhereInput = {
      ...(query.status ? { status: query.status } : {}),
    };

    if (search) {
      const rawRows = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT "id" FROM "Lead"
        WHERE "products"::text ILIKE ${`%${search}%`}
      `);
      const fromProducts = rawRows.map((r) => r.id);
      where.OR = [
        { id: { in: fromProducts } },
        { phone: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.LeadOrderByWithRelationInput =
      sortBy === 'total' ? { total: sortOrder } : { [sortBy]: sortOrder };

    const [rows, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        include: {
          confirmedBy: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      }),
      this.prisma.lead.count({ where }),
    ]);

    return createPaginatedResponse(serializeLeads(rows), page, limit, total);
  }

  async findOne(id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        confirmedBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
    if (!lead) {
      throw new NotFoundException('Lead no encontrado');
    }
    return serializeLead(lead);
  }

  async createFromCartCheckout(dto: CartCheckoutLeadDto) {
    const lead = await this.prisma.lead.create({
      data: {
        products: toLeadProductsJson(dto.items),
        total: dto.total,
        phone: dto.phone,
        customerName: dto.customerName,
        notes: dto.notes,
      },
    });

    const whatsappUrl = this.buildWhatsAppUrl(dto, lead.id);

    return {
      ...serializeLead(lead),
      whatsappUrl,
    };
  }

  async confirmSale(leadId: string, adminId: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      throw new NotFoundException('Lead no encontrado');
    }

    if (lead.status === LeadStatus.SOLD) {
      throw new BadRequestException('Este lead ya fue confirmado');
    }
    if (lead.status === LeadStatus.CANCELLED) {
      throw new BadRequestException('No puede confirmar un lead cancelado');
    }

    const checkoutItems = parseLeadProducts(lead.products);
    if (!checkoutItems.length) {
      throw new BadRequestException('El lead no contiene productos para confirmar');
    }

    const productIds = checkoutItems.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, stock: true, status: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const missing = productIds.filter((id) => !productMap.has(id));
    if (missing.length) {
      throw new NotFoundException(
        `Productos no encontrados para confirmar venta: ${missing.join(', ')}`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const movements: Array<{ id: string }> = [];

      for (const item of checkoutItems) {
        const product = productMap.get(item.productId)!;
        const previousStock = product.stock;
        if (item.quantity > previousStock) {
          throw new BadRequestException(
            `Stock insuficiente para ${product.name}. Disponible: ${previousStock}, solicitado: ${item.quantity}`,
          );
        }
        const newStock = previousStock - item.quantity;

        const movement = await tx.inventoryMovement.create({
          data: {
            productId: product.id,
            type: InventoryMovementType.SALE,
            quantity: item.quantity,
            previousStock,
            newStock,
            notes: `[lead:${leadId}] Confirmación de venta desde panel`,
            createdById: adminId,
          },
        });

        await tx.product.update({
          where: { id: product.id },
          data: buildProductStockUpdateData(product.status, newStock),
        });

        product.stock = newStock;
        movements.push({ id: movement.id });
      }

      await tx.lead.update({
        where: { id: leadId },
        data: {
          status: LeadStatus.SOLD,
          confirmedById: adminId,
          soldAt: new Date(),
          cancelledAt: null,
        },
      });

      return movements;
    });

    return {
      leadId,
      confirmed: true,
      movementsCreated: result.length,
    };
  }

  async markAsContacted(leadId: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      throw new NotFoundException('Lead no encontrado');
    }
    if (lead.status === LeadStatus.SOLD) {
      throw new BadRequestException('No puede marcar como contactado un lead vendido');
    }
    if (lead.status === LeadStatus.CANCELLED) {
      throw new BadRequestException(
        'No puede marcar como contactado un lead cancelado',
      );
    }
    const updated = await this.prisma.lead.update({
      where: { id: leadId },
      data: { status: LeadStatus.CONTACTED },
      include: {
        confirmedBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
    return serializeLead(updated);
  }

  async cancelLead(leadId: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      throw new NotFoundException('Lead no encontrado');
    }
    if (lead.status === LeadStatus.SOLD) {
      throw new BadRequestException('No puede cancelar un lead vendido');
    }
    if (lead.status === LeadStatus.CANCELLED) {
      throw new BadRequestException('Este lead ya está cancelado');
    }
    const updated = await this.prisma.lead.update({
      where: { id: leadId },
      data: {
        status: LeadStatus.CANCELLED,
        cancelledAt: new Date(),
      },
      include: {
        confirmedBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
    return serializeLead(updated);
  }

  private buildWhatsAppUrl(dto: CartCheckoutLeadDto, leadId: string): string {
    const businessPhone = this.normalizePhone(
      this.configService.get<string>('LEADS_WHATSAPP_PHONE') ?? dto.phone ?? '',
    );
    const customerPhone = this.normalizePhone(dto.phone ?? '');
    const lines = [
      'Hola, quiero confirmar mi pedido:',
      ...dto.items.map((item, idx) => {
        const details = [
          `x${item.quantity}`,
          item.storage ? `Storage: ${item.storage}` : null,
          item.color ? `Color: ${item.color}` : null,
          `Condicion: ${item.condition}`,
        ]
          .filter(Boolean)
          .join(' | ');
        return `${idx + 1}. ${item.name} (${details}) - S/${item.price}`;
      }),
      `Total: S/${dto.total}`,
      customerPhone ? `Telefono cliente: ${customerPhone}` : null,
      `Lead ID: ${leadId}`,
    ].filter(Boolean);

    const text = encodeURIComponent(lines.join('\n'));
    return `https://wa.me/${businessPhone}?text=${text}`;
  }

  private normalizePhone(value: string): string {
    return value.replace(/\D/g, '');
  }

}
