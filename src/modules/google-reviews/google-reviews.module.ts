import { Module } from '@nestjs/common';
import { GooglePlacesDetailsAdapter } from './adapters/google-places-details.adapter';
import { GoogleReviewsService } from './google-reviews.service';
import { GoogleReviewsSyncScheduler } from './google-reviews-sync.scheduler';
import { PublicGoogleReviewsController } from './public-google-reviews.controller';

@Module({
  controllers: [PublicGoogleReviewsController],
  providers: [
    GoogleReviewsService,
    GooglePlacesDetailsAdapter,
    GoogleReviewsSyncScheduler,
  ],
  exports: [GoogleReviewsService],
})
export class GoogleReviewsModule {}
