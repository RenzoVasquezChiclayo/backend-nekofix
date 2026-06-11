import { ProductCatalogType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'El slug debe ser kebab-case',
  })
  slug: string;

  @IsOptional()
  @IsString()
  icon?: string;

  /** Segmento de catálogo (DEVICE, SPARE_PART, ACCESSORY). Opcional: default DEVICE en servicio. */
  @IsOptional()
  @IsEnum(ProductCatalogType)
  catalogType?: ProductCatalogType;
}
