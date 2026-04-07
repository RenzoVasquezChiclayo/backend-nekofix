import { Controller, Get } from '@nestjs/common';
import { GoogleReviewsService } from './google-reviews.service';

@Controller('public/google-reviews')
export class PublicGoogleReviewsController {
  constructor(private readonly googleReviewsService: GoogleReviewsService) {}

  @Get()
  getGoogleReviews() {
    return this.googleReviewsService.getPublicGoogleReviews();
  }
}
