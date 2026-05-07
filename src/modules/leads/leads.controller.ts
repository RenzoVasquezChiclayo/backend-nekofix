import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Message } from '../../common/decorators/message.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUserPayload } from '../../common/interfaces/jwt-user-payload.interface';
import { CartCheckoutLeadDto } from './dto/cart-checkout-lead.dto';
import { QueryLeadDto } from './dto/query-lead.dto';
import { LeadsService } from './leads.service';

@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Message('Leads obtenidos')
  findAll(@Query() query: QueryLeadDto) {
    console.log('[LEADS QUERY]', query);
    return this.leadsService.findAll(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Message('Lead obtenido')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.leadsService.findOne(id);
  }

  @Post('cart-checkout')
  @Message('Lead de checkout guardado')
  cartCheckout(@Body() dto: CartCheckoutLeadDto) {
    return this.leadsService.createFromCartCheckout(dto);
  }

  @Post(':id/confirm')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Message('Venta confirmada y stock actualizado')
  confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.leadsService.confirmSale(id, user.id);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Message('Lead cancelado')
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.leadsService.cancelLead(id);
  }

  @Post(':id/contact')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Message('Lead marcado como contactado')
  contact(@Param('id', ParseUUIDPipe) id: string) {
    return this.leadsService.markAsContacted(id);
  }
}
