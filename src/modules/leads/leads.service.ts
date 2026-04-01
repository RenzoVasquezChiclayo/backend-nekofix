import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { createPaginatedResponse } from '../../common/utils/paginated-response';
import { decimalToNumber } from '../../common/utils/serialize-json';
import { PrismaService } from '../../prisma/prisma.service';
import { CartCheckoutLeadDto } from './dto/cart-checkout-lead.dto';

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = {};

    const [rows, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.lead.count({ where }),
    ]);

    const data = rows.map((lead) => ({
      id: lead.id,
      products: lead.products,
      total: decimalToNumber(lead.total),
      phone: lead.phone,
      createdAt: lead.createdAt,
    }));

    return createPaginatedResponse(data, page, limit, total);
  }

  async createFromCartCheckout(dto: CartCheckoutLeadDto) {
    const lead = await this.prisma.lead.create({
      data: {
        products: dto.products as Prisma.InputJsonValue,
        total: dto.total,
        phone: dto.phone,
      },
    });
    return {
      id: lead.id,
      products: lead.products,
      total: decimalToNumber(lead.total),
      phone: lead.phone,
      createdAt: lead.createdAt,
    };
  }
}
