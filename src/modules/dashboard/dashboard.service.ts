import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface DashboardStats {
  totalProducts: number;
  publishedProducts: number;
  lowStockProducts: number;
  featuredProducts: number;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(): Promise<DashboardStats> {
    const [
      totalProducts,
      publishedProducts,
      featuredProducts,
      lowStockProducts,
    ] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.product.count({ where: { isPublished: true } }),
      this.prisma.product.count({ where: { isFeatured: true } }),
      this.countLowStockProducts(),
    ]);

    return {
      totalProducts,
      publishedProducts,
      lowStockProducts,
      featuredProducts,
    };
  }

  /** Stock bajo: stock <= minStock (comparación entre columnas; no soportada en where estándar). */
  private async countLowStockProducts(): Promise<number> {
    const rows = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint AS count
      FROM "Product"
      WHERE "stock" <= "minStock"
    `;
    return Number(rows[0]?.count ?? 0);
  }
}
