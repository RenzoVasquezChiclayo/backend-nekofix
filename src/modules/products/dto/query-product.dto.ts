import { ProductCondition, ProductType } from '@prisma/client';
import { Type } from 'class-transformer';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class QueryProductDto {
  /** Filtro por UUID (p. ej. panel admin al enlazar listado con un producto). */
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  brandId?: string;

  @IsOptional()
  @IsString()
  modelId?: string;

  /** @deprecated Preferir `brandId`. Slug de marca (compat. panel legacy). */
  @IsOptional()
  @IsString()
  brand?: string;

  /** @deprecated Preferir `categoryId`. Slug de categoría (compat. panel legacy). */
  @IsOptional()
  @IsString()
  category?: string;

  /** @deprecated Preferir `modelId`. Slug de modelo (compat. panel legacy). */
  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsEnum(ProductCondition)
  condition?: ProductCondition;

  @IsOptional()
  @IsEnum(ProductType)
  type?: ProductType;

  /** Filtro por `grade` almacenado (A+, A, B). Ej.: `?grade=A` o `grade=A%2B` */
  @IsOptional()
  @Transform(({ value }) => {
    if (value == null || value === '') return undefined;
    return String(value).trim().toUpperCase();
  })
  @IsIn(['A+', 'A', 'B'])
  grade?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['price', 'createdAt'])
  sortBy?: 'price' | 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @Type(() => Boolean)
  featured?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  isFeatured?: boolean;
}
