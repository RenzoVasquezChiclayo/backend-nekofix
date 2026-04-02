import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateProductImageDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^(https?:\/\/.+|\/[\w\-./%]+)$/, {
    message: 'url debe ser http(s) o una ruta que empiece con /',
  })
  url: string;

  @IsOptional()
  @IsString()
  alt?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isPrimary?: boolean;
}
