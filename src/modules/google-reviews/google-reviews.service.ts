import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExternalReviewSource, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GooglePlacesDetailsAdapter } from './adapters/google-places-details.adapter';

export interface PublicGoogleReviewsReviewDto {
  id: string;
  source: ExternalReviewSource;
  authorName: string;
  authorPhoto: string | null;
  rating: number;
  text: string;
  relativeTime: string | null;
  createdAt: Date;
}

export interface PublicGoogleReviewsPayload {
  averageRating: number | null;
  totalReviews: number;
  reviews: PublicGoogleReviewsReviewDto[];
}

export type PublicGoogleReviewsHttpResponse = {
  success: true;
  data: PublicGoogleReviewsPayload;
};

@Injectable()
export class GoogleReviewsService {
  private readonly logger = new Logger(GoogleReviewsService.name);
  private memoryCache: {
    payload: PublicGoogleReviewsHttpResponse;
    expiresAtMs: number;
  } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly googlePlacesAdapter: GooglePlacesDetailsAdapter,
  ) {}

  /**
   * Respuesta pública con caché en memoria (TTL configurable, por defecto 6 h).
   */
  async getPublicGoogleReviews(): Promise<PublicGoogleReviewsHttpResponse> {
    const ttl = this.getCacheTtlMs();
    const now = Date.now();
    if (this.memoryCache && now < this.memoryCache.expiresAtMs) {
      return this.memoryCache.payload;
    }
    const payload = await this.buildPublicPayloadFromDb();
    const wrapped: PublicGoogleReviewsHttpResponse = {
      success: true,
      data: payload,
    };
    this.memoryCache = { payload: wrapped, expiresAtMs: now + ttl };
    return wrapped;
  }

  /** Sincroniza reseñas desde Google Places y actualiza el resumen oficial. */
  async syncGooglePlacesReviews(): Promise<void> {
    // ─── PASO 1: fuera de la transacción (red, CPU, preparación de datos) ───
    const pulled = await this.googlePlacesAdapter.pullGoogleMapsReviews();
    if (!pulled) {
      return;
    }

    const minRating = this.clampMinRating(
      this.config.get<number>('googleReviews.minRating') ?? 4,
    );
    const maxStored = this.clampMaxStored(
      this.config.get<number>('googleReviews.maxStored') ?? 10,
    );

    const filtered = pulled.reviews.filter((r) => r.rating >= minRating);
    filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const top = filtered.slice(0, maxStored);

    const source = pulled.source;
    const syncedAt = new Date();
    const averageDecimal =
      pulled.averageRating != null
        ? new Prisma.Decimal(pulled.averageRating.toFixed(2))
        : null;

    const createRows: Prisma.ExternalReviewCreateManyInput[] = top.map((r) => ({
      source,
      authorName: r.authorName,
      authorPhoto: r.authorPhoto,
      rating: r.rating,
      text: r.text,
      relativeTime: r.relativeTime,
      createdAt: r.createdAt,
    }));

    const createBatches = this.chunkCreateManyRows(createRows, 10);

    // ─── PASO 2: solo I/O rápida en BD ───
    await this.prisma.$transaction(
      async (tx) => {
        await tx.externalReview.deleteMany({ where: { source } });

        for (const batch of createBatches) {
          if (batch.length > 0) {
            await tx.externalReview.createMany({ data: batch });
          }
        }

        await tx.externalReviewSummary.upsert({
          where: { source },
          create: {
            source,
            averageRating: averageDecimal,
            totalReviews: pulled.totalReviews,
            lastSyncedAt: syncedAt,
          },
          update: {
            averageRating: averageDecimal,
            totalReviews: pulled.totalReviews,
            lastSyncedAt: syncedAt,
          },
        });
      },
      {
        timeout: 15_000,
        maxWait: 10_000,
      },
    );

    this.invalidateCache();
  }

  invalidateCache(): void {
    this.memoryCache = null;
  }

  private getCacheTtlMs(): number {
    const raw = this.config.get<number>('googleReviews.cacheTtlMs');
    const ms = typeof raw === 'number' && raw > 0 ? raw : 6 * 60 * 60 * 1000;
    return ms;
  }

  private clampMinRating(n: number): number {
    if (!Number.isFinite(n)) return 4;
    return Math.min(5, Math.max(1, Math.round(n)));
  }

  private clampMaxStored(n: number): number {
    if (!Number.isFinite(n)) return 10;
    return Math.min(50, Math.max(1, Math.round(n)));
  }

  /** Particiones para createMany sin trabajo pesado dentro de la transacción. */
  private chunkCreateManyRows(
    rows: Prisma.ExternalReviewCreateManyInput[],
    size: number,
  ): Prisma.ExternalReviewCreateManyInput[][] {
    if (rows.length === 0) {
      return [];
    }
    const batches: Prisma.ExternalReviewCreateManyInput[][] = [];
    for (let i = 0; i < rows.length; i += size) {
      batches.push(rows.slice(i, i + size));
    }
    return batches;
  }

  private async buildPublicPayloadFromDb(): Promise<PublicGoogleReviewsPayload> {
    const source = ExternalReviewSource.GOOGLE_MAPS;

    const [summary, rows] = await Promise.all([
      this.prisma.externalReviewSummary.findUnique({ where: { source } }),
      this.prisma.externalReview.findMany({
        where: { source },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const avg = summary?.averageRating
      ? Number(summary.averageRating.toString())
      : null;

    return {
      averageRating: avg,
      totalReviews: summary?.totalReviews ?? 0,
      reviews: rows.map((r) => ({
        id: r.id,
        source: r.source,
        authorName: r.authorName,
        authorPhoto: r.authorPhoto,
        rating: r.rating,
        text: r.text,
        relativeTime: r.relativeTime,
        createdAt: r.createdAt,
      })),
    };
  }
}
