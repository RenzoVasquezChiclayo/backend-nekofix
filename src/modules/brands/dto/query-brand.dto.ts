import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class QueryBrandDto {
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
  search?: string;

  /** Filtro exacto por slug de marca. */
  @IsOptional()
  @IsString()
  slug?: string;

  /** @deprecated Preferir `slug`. Alias legacy usado por algunos paneles. */
  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsIn(['createdAt', 'name'])
  sortBy?: 'createdAt' | 'name';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
