import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { GoogleReviewsService } from './google-reviews.service';

@Injectable()
export class GoogleReviewsSyncScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(GoogleReviewsSyncScheduler.name);

  constructor(
    private readonly config: ConfigService,
    private readonly googleReviews: GoogleReviewsService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const enabled =
      this.config.get<boolean>('googleReviews.syncOnBootstrap') ?? true;
    if (!enabled) {
      return;
    }
    try {
      await this.googleReviews.syncGooglePlacesReviews();
    } catch (e) {
      this.logger.error(
        `Sincronización inicial de reseñas Google falló: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  /** Cada 6 horas (minuto 0). */
  @Cron('0 */6 * * *')
  async handleCron(): Promise<void> {
    try {
      await this.googleReviews.syncGooglePlacesReviews();
    } catch (e) {
      this.logger.error(
        `Cron reseñas Google: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
}
