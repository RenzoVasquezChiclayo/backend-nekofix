import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExternalReviewSource } from '@prisma/client';
import {
  ExternalReviewsPullResult,
  NormalizedExternalReview,
} from '../ports/external-reviews-sync.port';

/** Respuesta parcial de Place Details (legacy) con campos solicitados. */
interface GooglePlaceReviewRaw {
  author_name: string;
  profile_photo_url?: string;
  rating: number;
  relative_time_description?: string;
  text: string;
  time: number;
}

interface GooglePlaceDetailsApiResponse {
  result?: {
    rating?: number;
    user_ratings_total?: number;
    reviews?: GooglePlaceReviewRaw[];
  };
  status: string;
  error_message?: string;
}

@Injectable()
export class GooglePlacesDetailsAdapter {
  private readonly logger = new Logger(GooglePlacesDetailsAdapter.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Obtiene reseñas y métricas agregadas vía Place Details (Maps JavaScript API / Places).
   * La API key solo se usa en servidor.
   */
  async pullGoogleMapsReviews(): Promise<ExternalReviewsPullResult | null> {
    const apiKey = this.config.get<string>('googleReviews.apiKey')?.trim() ?? '';
    const placeId = this.config.get<string>('googleReviews.placeId')?.trim() ?? '';
    if (!apiKey || !placeId) {
      this.logger.warn(
        'Google Places: faltan GOOGLE_PLACES_API_KEY o GOOGLE_PLACE_ID; se omite la sincronización.',
      );
      return null;
    }

    const language =
      this.config.get<string>('googleReviews.language')?.trim() || 'es';
    const region =
      this.config.get<string>('googleReviews.region')?.trim() || 'PE';

    const fields = 'reviews,rating,user_ratings_total';
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    url.searchParams.set('place_id', placeId);
    url.searchParams.set('fields', fields);
    url.searchParams.set('language', language);
    url.searchParams.set('region', region);
    url.searchParams.set('key', apiKey);

    let body: GooglePlaceDetailsApiResponse;
    try {
      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      body = (await res.json()) as GooglePlaceDetailsApiResponse;
    } catch (e) {
      this.logger.error(
        `Google Places: error de red al consultar Place Details: ${e instanceof Error ? e.message : String(e)}`,
      );
      return null;
    }

    if (body.status !== 'OK' && body.status !== 'ZERO_RESULTS') {
      this.logger.warn(
        `Google Places: status=${body.status}${body.error_message ? ` — ${body.error_message}` : ''}`,
      );
      return null;
    }

    const result = body.result;
    const rawReviews = result?.reviews ?? [];

    const reviews: NormalizedExternalReview[] = rawReviews.map((r) => ({
      authorName: r.author_name,
      authorPhoto: r.profile_photo_url ?? null,
      rating: r.rating,
      text: r.text ?? '',
      relativeTime: r.relative_time_description ?? null,
      createdAt: new Date((r.time ?? 0) * 1000),
    }));

    return {
      source: ExternalReviewSource.GOOGLE_MAPS,
      averageRating:
        typeof result?.rating === 'number' && !Number.isNaN(result.rating)
          ? result.rating
          : null,
      totalReviews:
        typeof result?.user_ratings_total === 'number' &&
        !Number.isNaN(result.user_ratings_total)
          ? result.user_ratings_total
          : null,
      reviews,
    };
  }
}
