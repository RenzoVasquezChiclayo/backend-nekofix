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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Message } from '../../common/decorators/message.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { QueryBrandDto } from './dto/query-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  @Message('Marcas obtenidas')
  findAll(@Query() query: QueryBrandDto) {
    return this.brandsService.findAll(query);
  }

  @Get('slug/:slug')
  @Message('Marca obtenida')
  findBySlug(@Param('slug') slug: string) {
    return this.brandsService.findBySlug(slug);
  }

  /** Ruta explícita por UUID (misma respuesta que GET /:id; prioridad sobre slugs ambiguos). */
  @Get('id/:id')
  @Message('Marca obtenida')
  findOneByExplicitId(@Param('id', ParseUUIDPipe) id: string) {
    return this.brandsService.findOne(id);
  }

  @Get(':id')
  @Message('Marca obtenida')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.brandsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Message('Marca creada correctamente')
  create(@Body() dto: CreateBrandDto) {
    return this.brandsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Message('Marca actualizada correctamente')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBrandDto,
  ) {
    return this.brandsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Message('Marca eliminada correctamente')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.brandsService.remove(id);
  }
}
