import {
  ProductCatalogType,
  ProductCondition,
  ProductStatus,
  ProductType,
} from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PRODUCT_COLOR_HEX_PATTERN } from '../../../common/utils/product-color.util';
import { CreateProductImageDto } from './create-product-image.dto';

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

  /** Segmento de catálogo (DEVICE, SPARE_PART, ACCESSORY). Opcional: default DEVICE en servicio. */
  @IsOptional()
  @IsEnum(ProductCatalogType)
  catalogType?: ProductCatalogType;

  @IsEnum(ProductCondition)
  condition: ProductCondition;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    return value;
  })
  @IsUUID()
  conditionId?: string | null;

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

  /** Nombre legible del acabado (p. ej. para swatches en tienda). Se normaliza en el servicio. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  color?: string | null;

  /** Color visual en HEX (#RGB o #RRGGBB). Opcional; se normaliza en el servicio. */
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
  @IsInt()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  batteryHealth?: number;

  /**
   * Solo aplica a `ProductType.USED` (A+, A, B). Para NEW/ACCESSORY se ignora en persistencia (`null`).
   * No depende de `condition`.
   */
  @Transform(({ value, obj }: { value: unknown; obj: CreateProductDto }) => {
    if (obj.type !== ProductType.USED) {
      return undefined;
    }
    if (value == null || value === '') {
      return value as null | undefined;
    }
    return String(value).trim().toUpperCase();
  })
  @ValidateIf((o: CreateProductDto) => o.type === ProductType.USED)
  @IsNotEmpty({ message: 'El grado es obligatorio para productos usados (A+, A o B).' })
  @ValidateIf((o: CreateProductDto) => o.type === ProductType.USED)
  @IsIn(['A+', 'A', 'B'], {
    message: 'El grado debe ser A+, A o B.',
  })
  grade?: string;

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

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isFeatured?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isPublished?: boolean;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsString()
  seoTitle?: string;

  @IsOptional()
  @IsString()
  seoDescription?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductImageDto)
  images?: CreateProductImageDto[];
}
