import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CartCheckoutLeadDto {
  @IsNotEmpty()
  products: unknown;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  total: number;

  @IsOptional()
  @IsString()
  phone?: string;
}
