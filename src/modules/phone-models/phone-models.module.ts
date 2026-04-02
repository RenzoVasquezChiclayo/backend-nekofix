import { Module } from '@nestjs/common';
import { PhoneModelsController } from './phone-models.controller';
import { PhoneModelsService } from './phone-models.service';

@Module({
  controllers: [PhoneModelsController],
  providers: [PhoneModelsService],
  exports: [PhoneModelsService],
})
export class PhoneModelsModule {}
