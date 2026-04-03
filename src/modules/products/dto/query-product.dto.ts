import { ProductCondition, ProductType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class QueryProductDto {
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
