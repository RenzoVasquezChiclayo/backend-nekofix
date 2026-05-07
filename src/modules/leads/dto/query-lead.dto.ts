import { LeadStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class QueryLeadDto {
  @IsOptional()
  @Transform(({ value }) => (value === '' || value == null ? undefined : value))
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => (value === '' || value == null ? undefined : value))
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  )
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() === ''
      ? undefined
      : String(value).trim().toUpperCase(),
  )
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() === ''
      ? undefined
      : String(value).trim(),
  )
  @IsIn(['createdAt', 'total', 'status'])
  sortBy?: 'createdAt' | 'total' | 'status';

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() === ''
      ? undefined
      : String(value).trim().toLowerCase(),
  )
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
