import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUserPayload } from '../../common/interfaces/jwt-user-payload.interface';
import { Message } from '../../common/decorators/message.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('featured')
  @Message('Productos destacados')
  featured() {
    return this.productsService.findFeatured();
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @Message('Productos obtenidos')
  findAll(
    @Query() query: QueryProductDto,
    @Req() req: Request & { user?: JwtUserPayload },
  ) {
    const isAdmin = req.user?.role === UserRole.ADMIN;
    return this.productsService.findAll(query, { includeUnpublished: !!isAdmin });
  }

  @Get(':slug')
  @UseGuards(OptionalJwtAuthGuard)
  @Message('Producto obtenido')
  findOne(
    @Param('slug') slug: string,
    @Req() req: Request & { user?: JwtUserPayload },
  ) {
    const isAdmin = req.user?.role === UserRole.ADMIN;
    return this.productsService.findBySlug(slug, { includeUnpublished: !!isAdmin });
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Message('Producto creado correctamente')
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Message('Producto actualizado correctamente')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Message('Producto eliminado correctamente')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
