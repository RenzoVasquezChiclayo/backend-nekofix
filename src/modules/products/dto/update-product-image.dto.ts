import { PartialType } from '@nestjs/mapped-types';
import { CreateProductImageDto } from './create-product-image.dto';

/** Payload parcial para futuras operaciones por imagen (mismo shape base). */
export class UpdateProductImageDto extends PartialType(CreateProductImageDto) {}
