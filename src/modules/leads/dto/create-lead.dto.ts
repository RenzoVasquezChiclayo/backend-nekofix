import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { LeadProductItemDto } from './cart-checkout-lead.dto';

export class CreateLeadDto {
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
  @IsNotEmpty()
  customerName?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
