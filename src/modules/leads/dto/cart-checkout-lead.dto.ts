import { ProductCondition } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class LeadProductItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity: number;

  @IsOptional()
  @IsString()
  storage?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsEnum(ProductCondition)
  condition: ProductCondition;
}

export class CartCheckoutLeadDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LeadProductItemDto)
  items: LeadProductItemDto[];

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  total: number;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
