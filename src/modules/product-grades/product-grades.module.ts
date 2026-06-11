import { Module } from '@nestjs/common';
import { ProductGradesController } from './product-grades.controller';
import { ProductGradesService } from './product-grades.service';

@Module({
  controllers: [ProductGradesController],
  providers: [ProductGradesService],
  exports: [ProductGradesService],
})
export class ProductGradesModule {}
