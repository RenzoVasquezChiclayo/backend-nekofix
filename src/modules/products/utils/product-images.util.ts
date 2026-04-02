export type ProductImageInput = {
  url: string;
  alt?: string;
  sortOrder?: number;
  isPrimary?: boolean;
};

export type NormalizedProductImage = {
  url: string;
  alt: string | null;
  sortOrder: number;
  isPrimary: boolean;
};

/**
 * Ordena por sortOrder, garantiza exactamente una imagen principal
 * (si ninguna viene marcada, la primera pasa a ser principal).
 */
export function normalizeProductImagesForWrite(
  images: ProductImageInput[],
): NormalizedProductImage[] {
  if (!images.length) return [];

  const mapped: NormalizedProductImage[] = images.map((img, idx) => ({
    url: img.url.trim(),
    alt: img.alt?.trim() ? img.alt.trim() : null,
    sortOrder: img.sortOrder ?? idx,
    isPrimary: !!img.isPrimary,
  }));

  mapped.sort((a, b) => a.sortOrder - b.sortOrder);

  const primaryIdx = mapped.findIndex((i) => i.isPrimary);
  const finalPrimary = primaryIdx >= 0 ? primaryIdx : 0;

  return mapped.map((m, i) => ({
    ...m,
    isPrimary: i === finalPrimary,
  }));
}
