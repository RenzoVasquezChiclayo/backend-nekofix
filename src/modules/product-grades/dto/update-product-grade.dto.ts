import { PartialType } from '@nestjs/mapped-types';
import { CreateProductGradeDto } from './create-product-grade.dto';

export class UpdateProductGradeDto extends PartialType(CreateProductGradeDto) {}
