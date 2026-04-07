import { ExternalReviewSource } from '@prisma/client';

/** Reseña normalizada lista para persistir (cualquier proveedor externo). */
export interface NormalizedExternalReview {
  authorName: string;
  authorPhoto: string | null;
  rating: number;
  text: string;
  relativeTime: string | null;
  createdAt: Date;
}

/** Resultado de un “pull” desde una fuente externa (Google, Trustpilot, etc.). */
export interface ExternalReviewsPullResult {
  source: ExternalReviewSource;
  averageRating: number | null;
  totalReviews: number | null;
  reviews: NormalizedExternalReview[];
}
