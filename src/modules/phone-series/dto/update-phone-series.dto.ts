import { PartialType } from '@nestjs/mapped-types';
import { CreatePhoneSeriesDto } from './create-phone-series.dto';

export class UpdatePhoneSeriesDto extends PartialType(CreatePhoneSeriesDto) {}
