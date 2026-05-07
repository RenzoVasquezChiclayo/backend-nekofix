import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Message } from '../../common/decorators/message.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { InventoryReportQueryDto } from './dto/inventory-report-query.dto';
import { ReportDateRangeDto } from './dto/report-date-range.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @Message('Métricas de dashboard obtenidas')
  dashboard(@Query() query: ReportDateRangeDto) {
    if (process.env.NODE_ENV !== 'production') console.log('[reports]', query);
    return this.reportsService.dashboard(query);
  }

  @Get('sales/monthly')
  @Message('Ventas mensuales obtenidas')
  salesMonthly(@Query() query: ReportDateRangeDto) {
    if (process.env.NODE_ENV !== 'production') console.log('[reports]', query);
    return this.reportsService.salesMonthly(query);
  }

  @Get('leads/status')
  @Message('Conteo de leads por estado obtenido')
  leadsByStatus(@Query() query: ReportDateRangeDto) {
    if (process.env.NODE_ENV !== 'production') console.log('[reports]', query);
    return this.reportsService.leadsByStatus(query);
  }

  @Get('products/top-selling')
  @Message('Productos más vendidos obtenidos')
  topSellingProducts(@Query() query: ReportDateRangeDto) {
    if (process.env.NODE_ENV !== 'production') console.log('[reports]', query);
    return this.reportsService.topSellingProducts(query);
  }

  @Get('inventory/summary')
  @Message('Resumen de inventario obtenido')
  inventorySummary(@Query() query: InventoryReportQueryDto) {
    if (process.env.NODE_ENV !== 'production') console.log('[reports]', query);
    return this.reportsService.inventorySummary(query);
  }

  @Get('inventory/low-stock')
  @Message('Productos con stock bajo obtenidos')
  inventoryLowStock(@Query() query: InventoryReportQueryDto) {
    if (process.env.NODE_ENV !== 'production') console.log('[reports]', query);
    return this.reportsService.inventoryLowStock(query);
  }
}
