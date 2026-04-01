import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUserPayload } from '../../common/interfaces/jwt-user-payload.interface';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Message } from '../../common/decorators/message.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { InventoryMoveDto } from './dto/inventory-move.dto';
import { InventoryService } from './inventory.service';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('move')
  @Message('Movimiento de inventario registrado')
  move(@Body() dto: InventoryMoveDto, @CurrentUser() user: JwtUserPayload) {
    return this.inventoryService.move(dto, user.id);
  }

  @Get('history/:productId')
  @Message('Historial de inventario obtenido')
  history(
    @Param('productId') productId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.inventoryService.history(productId, query);
  }
}
