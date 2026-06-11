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
import { CreateProductGradeDto } from './dto/create-product-grade.dto';
import { QueryProductGradeDto } from './dto/query-product-grade.dto';
import { UpdateProductGradeDto } from './dto/update-product-grade.dto';
import { ProductGradesService } from './product-grades.service';

@Controller('product-grades')
export class ProductGradesController {
  constructor(private readonly productGradesService: ProductGradesService) {}

  @Get()
  @Message('Grados obtenidos')
  findAll(@Query() query: QueryProductGradeDto) {
    return this.productGradesService.findAll(query);
  }

  @Get(':id')
  @Message('Grado obtenido')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productGradesService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Message('Grado creado correctamente')
  create(@Body() dto: CreateProductGradeDto) {
    return this.productGradesService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Message('Grado actualizado correctamente')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductGradeDto,
  ) {
    return this.productGradesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Message('Grado eliminado correctamente')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productGradesService.remove(id);
  }
}
