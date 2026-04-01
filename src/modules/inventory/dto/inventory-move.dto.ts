import { InventoryMovementType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class InventoryMoveDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsEnum(InventoryMovementType)
  type: InventoryMovementType;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  quantity: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
