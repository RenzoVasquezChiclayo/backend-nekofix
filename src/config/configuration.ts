const safeInt = (value: string | undefined, fallback: number): number => {
  const n = parseInt(value ?? '', 10);
  return Number.isNaN(n) ? fallback : n;
};

export default () => ({
  port: safeInt(process.env.PORT, 3000),
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()) ?? [
      'http://localhost:3000',
      'http://localhost:3001',
    ],
  },
  googleReviews: {
    apiKey: process.env.GOOGLE_PLACES_API_KEY ?? '',
    placeId: process.env.GOOGLE_PLACE_ID ?? '',
    language:
      (process.env.GOOGLE_REVIEWS_LANGUAGE ?? 'es').trim() || 'es',
    region: (process.env.GOOGLE_REVIEWS_REGION ?? 'PE').trim() || 'PE',
    minRating: safeInt(process.env.GOOGLE_REVIEWS_MIN_RATING, 4),
    maxStored: safeInt(process.env.GOOGLE_REVIEWS_MAX_STORED, 10),
    cacheTtlMs: safeInt(
      process.env.GOOGLE_REVIEWS_CACHE_TTL_MS,
      6 * 60 * 60 * 1000,
    ),
    syncOnBootstrap:
      (process.env.GOOGLE_REVIEWS_SYNC_ON_BOOT ?? 'true').toLowerCase() ===
      'true',
  },
});
