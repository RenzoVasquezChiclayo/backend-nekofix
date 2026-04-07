import { OmitType, PartialType } from '@nestjs/mapped-types';
import { IsIn, IsOptional, ValidateIf } from 'class-validator';
import { CreateProductDto } from './create-product.dto';

/** `grade` se valida aparte: en actualización el tipo puede no venir en el body (reglas en ProductsService). */
export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['grade'] as const),
) {
  @IsOptional()
  @ValidateIf(
    (o: UpdateProductDto) =>
      o.grade != null && String(o.grade).trim() !== '',
  )
  @IsIn(['A+', 'A', 'B'], { message: 'El grado debe ser A+, A o B.' })
  grade?: string | null;
}
