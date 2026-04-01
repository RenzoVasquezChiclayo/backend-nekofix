import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Message } from '../../common/decorators/message.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CartCheckoutLeadDto } from './dto/cart-checkout-lead.dto';
import { LeadsService } from './leads.service';

@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Message('Leads obtenidos')
  findAll(@Query() query: PaginationQueryDto) {
    return this.leadsService.findAll(query);
  }

  @Post('cart-checkout')
  @Message('Lead de checkout guardado')
  cartCheckout(@Body() dto: CartCheckoutLeadDto) {
    return this.leadsService.createFromCartCheckout(dto);
  }
}
