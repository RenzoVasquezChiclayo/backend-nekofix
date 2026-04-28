import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUserPayload } from '../../common/interfaces/jwt-user-payload.interface';
import { Message } from '../../common/decorators/message.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { productsUploadMulterOptions } from './config/products-upload.multer';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { isUuidString } from '../../common/utils/is-uuid-string';
import { ProductsService } from './products.service';
import { CloudinaryService } from '../../common/services/cloudinary.service';

type UploadedProductImage = {
  buffer: Buffer;
  originalname: string;
};

@Controller('products')
export class ProductsController {
  private readonly logger = new Logger(ProductsController.name);

  constructor(
    private readonly productsService: ProductsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

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

  /** Evita que `/products/slug` caiga en `:id` y se interprete como slug literal. */
  @Get('slug')
  @UseGuards(OptionalJwtAuthGuard)
  slugSegmentIncomplete() {
    throw new BadRequestException(
      'Ruta incompleta: use GET /products/slug/:slug',
    );
  }

  /** Ruta explícita por slug (recomendada para el catálogo público y SEO). */
  @Get('slug/:slug')
  @UseGuards(OptionalJwtAuthGuard)
  @Message('Producto obtenido')
  findBySlugRoute(
    @Param('slug') slug: string,
    @Req() req: Request & { user?: JwtUserPayload },
  ) {
    const isAdmin = req.user?.role === UserRole.ADMIN;
    return this.productsService.findBySlug(slug, {
      includeUnpublished: !!isAdmin,
    });
  }

  /** Evita confundir `/products/id` con un UUID incompleto. */
  @Get('id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  idSegmentIncomplete() {
    throw new BadRequestException(
      'Ruta incompleta: use GET /products/id/:id con el UUID del producto',
    );
  }

  /**
   * Detalle por UUID para administración: siempre incluye borradores.
   * Requiere JWT admin (evita 404 cuando el producto no está publicado).
   */
  @Get('id/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Message('Producto obtenido')
  findOneByIdForAdmin(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findOne(id, { includeUnpublished: true });
  }

  /**
   * UUID → detalle por id (borradores solo si JWT admin).
   * Otro valor → detalle por slug (tienda pública, URLs históricas).
   */
  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @Message('Producto obtenido')
  findOne(
    @Param('id') idOrSlug: string,
    @Req() req: Request & { user?: JwtUserPayload },
  ) {
    const isAdmin = req.user?.role === UserRole.ADMIN;
    const segment = idOrSlug.trim();

    if (isUuidString(segment)) {
      return this.productsService.findOne(segment, {
        includeUnpublished: !!isAdmin,
      });
    }

    if (isAdmin) {
      this.logger.warn(
        `GET /products/:id recibió un slug en la ruta genérica; usar GET /products/slug/${encodeURIComponent(segment)} para mayor claridad`,
      );
    }

    return this.productsService.findBySlug(segment, {
      includeUnpublished: !!isAdmin,
    });
  }

  @Post('upload-image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file', productsUploadMulterOptions()))
  @Message('Imagen subida correctamente')
  async uploadImage(
    @UploadedFile()
    file: UploadedProductImage | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('Archivo requerido');
    }
    if (!file.buffer?.length) {
      throw new BadRequestException('Archivo inválido');
    }

    const url = await this.cloudinaryService.uploadProductImage(file.buffer, {
      filename: file.originalname.split('.').slice(0, -1).join('.') || undefined,
    });

    return {
      url,
    };
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
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Message('Producto eliminado correctamente')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.remove(id);
  }
}
