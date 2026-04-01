import { ProductCondition, ProductType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'El slug debe ser kebab-case',
  })
  slug: string;

  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  comparePrice?: number;

  @IsEnum(ProductType)
  type: ProductType;

  @IsEnum(ProductCondition)
  condition: ProductCondition;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  stock?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  minStock?: number;

  @IsString()
  @IsNotEmpty()
  brandId: string;

  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsOptional()
  @IsString()
  modelId?: string;

  @IsOptional()
  @IsString()
  storage?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  batteryHealth?: number;

  @IsOptional()
  @IsString()
  grade?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isFeatured?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isPublished?: boolean;

  @IsOptional()
  @IsString()
  seoTitle?: string;

  @IsOptional()
  @IsString()
  seoDescription?: string;
}
