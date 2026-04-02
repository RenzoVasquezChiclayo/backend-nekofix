import { PartialType } from '@nestjs/mapped-types';
import { CreatePhoneModelDto } from './create-phone-model.dto';

export class UpdatePhoneModelDto extends PartialType(CreatePhoneModelDto) {}
