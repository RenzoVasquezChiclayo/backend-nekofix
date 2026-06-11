import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Message } from '../../common/decorators/message.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateProductConditionDto } from './dto/create-product-condition.dto';
import { QueryProductConditionDto } from './dto/query-product-condition.dto';
import { UpdateProductConditionDto } from './dto/update-product-condition.dto';
import { ProductConditionsService } from './product-conditions.service';

@Controller('product-conditions')
export class ProductConditionsController {
  constructor(
    private readonly productConditionsService: ProductConditionsService,
  ) {}

  @Get()
  @Message('Condiciones obtenidas')
  findAll(@Query() query: QueryProductConditionDto) {
    return this.productConditionsService.findAll(query);
  }

  @Get(':id')
  @Message('Condición obtenida')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productConditionsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Message('Condición creada correctamente')
  create(@Body() dto: CreateProductConditionDto) {
    return this.productConditionsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Message('Condición actualizada correctamente')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductConditionDto,
  ) {
    return this.productConditionsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Message('Condición eliminada correctamente')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productConditionsService.remove(id);
  }
}
