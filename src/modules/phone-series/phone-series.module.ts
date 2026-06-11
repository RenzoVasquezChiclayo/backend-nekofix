import { Module } from '@nestjs/common';
import { PhoneSeriesController } from './phone-series.controller';
import { PhoneSeriesService } from './phone-series.service';

@Module({
  controllers: [PhoneSeriesController],
  providers: [PhoneSeriesService],
  exports: [PhoneSeriesService],
})
export class PhoneSeriesModule {}
