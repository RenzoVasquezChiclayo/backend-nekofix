import { Injectable } from '@nestjs/common';
import { LeadStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ReportDateRangeDto } from './dto/report-date-range.dto';
import { toNumber } from './serializers/reports.serializer';
import { resolveDateRange, toPrismaDateRange } from './utils/date-range.util';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(dto: ReportDateRangeDto) {
    const range = resolveDateRange(dto);
    const leadDateRange = toPrismaDateRange(range);
    const leadWhere: Prisma.LeadWhereInput = {
      createdAt: leadDateRange,
    };
    const soldWhere: Prisma.LeadWhereInput = {
      status: LeadStatus.SOLD,
      soldAt: leadDateRange,
    };
    const productWhere: Prisma.ProductWhereInput = {
      createdAt: leadDateRange,
    };

    const [
      totalProducts,
      totalPublishedProducts,
      totalLeads,
      pendingLeads,
      soldLeads,
      cancelledLeads,
      outOfStockProducts,
      salesAggregate,
      lowStockRows,
    ] = await Promise.all([
      this.prisma.product.count({ where: productWhere }),
      this.prisma.product.count({ where: { ...productWhere, isPublished: true } }),
      this.prisma.lead.count({ where: leadWhere }),
      this.prisma.lead.count({
        where: { ...leadWhere, status: LeadStatus.PENDING },
      }),
      this.prisma.lead.count({ where: soldWhere }),
      this.prisma.lead.count({
        where: { ...leadWhere, status: LeadStatus.CANCELLED },
      }),
      this.prisma.product.count({ where: { ...productWhere, stock: 0 } }),
      this.prisma.lead.aggregate({
        where: soldWhere,
        _sum: { total: true },
      }),
      this.prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM "Product"
        WHERE "stock" <= "minStock"
          AND "createdAt" >= ${range.startDate}
          AND "createdAt" <= ${range.endDate}
      `),
    ]);

    const totalSalesAmount = toNumber(salesAggregate._sum.total);
    const conversionRate = totalLeads
      ? Number(((soldLeads / totalLeads) * 100).toFixed(2))
      : 0;

    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log('[reports] dashboard', { totalLeads, soldLeads });
    }

    return {
      totalSales: soldLeads,
      pendingLeads,
      soldLeads,
      conversionRate,
      publishedProducts: totalPublishedProducts,
      lowStockProducts: Number(lowStockRows[0]?.count ?? 0),
      outOfStockProducts,
      totalRevenue: totalSalesAmount,
    };
  }

  async salesMonthly(query: ReportDateRangeDto) {
    const range = resolveDateRange(query);
    const rows = await this.prisma.$queryRaw<
      Array<{ monthKey: string; sales: bigint; revenue: Prisma.Decimal | null }>
    >(Prisma.sql`
      SELECT
        to_char(date_trunc('month', "soldAt"), 'YYYY-MM') AS "monthKey",
        COUNT(*)::bigint AS "sales",
        COALESCE(SUM("total"), 0)::numeric AS "revenue"
      FROM "Lead"
      WHERE "status" = 'SOLD'
        AND "soldAt" IS NOT NULL
        ${range.startDate ? Prisma.sql`AND "soldAt" >= ${range.startDate}` : Prisma.empty}
        ${range.endDate ? Prisma.sql`AND "soldAt" <= ${range.endDate}` : Prisma.empty}
      GROUP BY date_trunc('month', "soldAt")
      ORDER BY date_trunc('month', "soldAt") ASC
    `);

    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return rows.map((row) => ({
      month: monthNames[Math.max(0, Math.min(11, Number(row.monthKey.split('-')[1]) - 1))] ?? row.monthKey,
      sales: Number(row.sales),
      revenue: toNumber(row.revenue),
    }));
  }

  async leadsByStatus(query: ReportDateRangeDto) {
    const range = resolveDateRange(query);
    const where: Prisma.LeadWhereInput = {
      createdAt: toPrismaDateRange(range),
    };
    const grouped = await this.prisma.lead.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    });

    const defaultRows = Object.values(LeadStatus).map((status) => ({
      status,
      count: 0,
    }));
    for (const row of grouped) {
      const idx = defaultRows.findIndex((r) => r.status === row.status);
      if (idx >= 0) defaultRows[idx].count = row._count._all;
    }
    return defaultRows;
  }

  async topSellingProducts(query: ReportDateRangeDto) {
    const range = resolveDateRange(query);
    const rows = await this.prisma.$queryRaw<
      Array<{
        productId: string;
        quantitySold: bigint;
        revenue: Prisma.Decimal | null;
      }>
    >(Prisma.sql`
      SELECT
        item->>'productId' AS "productId",
        SUM(COALESCE((item->>'quantity')::int, 0))::bigint AS "quantitySold",
        SUM(
          COALESCE((item->>'price')::numeric, COALESCE((item->>'unitPrice')::numeric, 0))
          * COALESCE((item->>'quantity')::int, 0)
        )::numeric AS "revenue"
      FROM "Lead" l
      CROSS JOIN LATERAL jsonb_array_elements(l."products"::jsonb) item
      WHERE l."status" = 'SOLD'
        ${range.startDate ? Prisma.sql`AND l."soldAt" >= ${range.startDate}` : Prisma.empty}
        ${range.endDate ? Prisma.sql`AND l."soldAt" <= ${range.endDate}` : Prisma.empty}
      GROUP BY item->>'productId'
      ORDER BY "quantitySold" DESC
      LIMIT 10
    `);

    const ids = rows.map((r) => r.productId).filter(Boolean);
    const products = ids.length
      ? await this.prisma.product.findMany({
          where: { id: { in: ids } },
          select: {
            id: true,
            name: true,
            slug: true,
            productImages: {
              select: { url: true },
              orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
              take: 1,
            },
          },
        })
      : [];
    const productMap = new Map(products.map((p) => [p.id, p]));

    return rows.map((row) => {
      const product = productMap.get(row.productId);
      return {
        productId: row.productId,
        name: product?.name ?? 'Producto eliminado',
        slug: product?.slug ?? '',
        image: product?.productImages[0]?.url ?? null,
        quantitySold: Number(row.quantitySold),
        revenue: toNumber(row.revenue),
      };
    });
  }

  async inventorySummary(query: ReportDateRangeDto) {
    const range = resolveDateRange(query);
    const productWhere: Prisma.ProductWhereInput = {
      createdAt: toPrismaDateRange(range),
    };
    const [totalProducts, outOfStockProducts, totalUnitsAgg, inventoryValueAgg, lowRows] =
      await Promise.all([
        this.prisma.product.count({ where: productWhere }),
        this.prisma.product.count({ where: { ...productWhere, stock: 0 } }),
        this.prisma.product.aggregate({ where: productWhere, _sum: { stock: true } }),
        this.prisma.$queryRaw<Array<{ value: Prisma.Decimal | null }>>(Prisma.sql`
          SELECT COALESCE(SUM("price" * "stock"), 0)::numeric AS value
          FROM "Product"
          WHERE "createdAt" >= ${range.startDate}
            AND "createdAt" <= ${range.endDate}
        `),
        this.prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
          SELECT COUNT(*)::bigint AS count
          FROM "Product"
          WHERE "stock" <= "minStock"
            AND "createdAt" >= ${range.startDate}
            AND "createdAt" <= ${range.endDate}
        `),
      ]);

    return {
      totalProducts,
      totalStockUnits: totalUnitsAgg._sum.stock ?? 0,
      inventoryValue: toNumber(inventoryValueAgg[0]?.value),
      lowStockCount: Number(lowRows[0]?.count ?? 0),
      outOfStockCount: outOfStockProducts,
    };
  }

  async inventoryLowStock(query: ReportDateRangeDto) {
    const range = resolveDateRange(query);
    const limit = 20;

    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        slug: string;
        stock: number;
        minStock: number;
        price: Prisma.Decimal | null;
        image: string | null;
        status: 'OUT_OF_STOCK' | 'LOW_STOCK';
      }>
    >(Prisma.sql`
      SELECT
        p."id",
        p."name",
        p."slug",
        p."stock",
        p."minStock",
        p."price",
        (
          SELECT pi."url"
          FROM "ProductImage" pi
          WHERE pi."productId" = p."id"
          ORDER BY pi."isPrimary" DESC, pi."sortOrder" ASC
          LIMIT 1
        ) AS image,
        CASE
          WHEN p."stock" <= 0 THEN 'OUT_OF_STOCK'
          ELSE 'LOW_STOCK'
        END AS status
      FROM "Product" p
      WHERE p."stock" <= p."minStock"
        AND p."createdAt" >= ${range.startDate}
        AND p."createdAt" <= ${range.endDate}
      ORDER BY
        CASE WHEN p."stock" <= 0 THEN 0 ELSE 1 END ASC,
        p."stock" ASC,
        p."createdAt" DESC
      LIMIT ${limit}
    `);

    return rows.map((row) => ({
      ...row,
      price: toNumber(row.price),
    }));
  }
}
