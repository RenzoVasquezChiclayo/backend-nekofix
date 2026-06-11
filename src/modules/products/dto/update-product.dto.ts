import { OmitType, PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  ValidateIf,
} from 'class-validator';
import { PRODUCT_COLOR_HEX_PATTERN } from '../../../common/utils/product-color.util';
import { CreateProductDto } from './create-product.dto';

/**
 * `type` puede no venir en el body: reglas de obligatoriedad de `grade` para USED se aplican en ProductsService.
 * Si se envía `grade`, debe ser A+/A/B (tras normalizar). No depende de `condition`.
 */
export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['grade'] as const),
) {
  /**
   * Declarado explícitamente: `PartialType` + `@ValidateIf` en el padre
   * impedían el whitelist de `forbidNonWhitelisted`.
   */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const t = String(value).trim();
    if (t === '') return null;
    return t;
  })
  @IsString()
  @Matches(PRODUCT_COLOR_HEX_PATTERN, {
    message: 'colorHex debe ser un color HEX válido (#RGB o #RRGGBB)',
  })
  colorHex?: string | null;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }
    const t = String(value).trim();
    if (t === '') {
      return null;
    }
    return t.toUpperCase();
  })
  @ValidateIf(
    (o: UpdateProductDto) =>
      o.grade != null && String(o.grade).trim() !== '',
  )
  @IsIn(['A+', 'A', 'B'], { message: 'El grado debe ser A+, A o B.' })
  grade?: string | null;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    return value;
  })
  @IsUUID()
  conditionId?: string | null;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    return value;
  })
  @IsUUID()
  gradeId?: string | null;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    return value;
  })
  @IsUUID()
  seriesId?: string | null;
}
