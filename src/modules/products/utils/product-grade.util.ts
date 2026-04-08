import { BadRequestException } from '@nestjs/common';
import { ProductType } from '@prisma/client';

/** Grados comerciales permitidos para `ProductType.USED` (almacenados tal cual tras normalizar). */
export const PRODUCT_USED_GRADES = ['A+', 'A', 'B'] as const;
export type ProductUsedGrade = (typeof PRODUCT_USED_GRADES)[number];

const USED_GRADE_SET = new Set<string>(PRODUCT_USED_GRADES);

export function isValidUsedGrade(value: string): value is ProductUsedGrade {
  return USED_GRADE_SET.has(value);
}

/** Trim + mayúsculas (p. ej. `a+` → `A+`). */
export function normalizeProductGrade(
  raw: string | null | undefined,
): string | null {
  if (raw == null) return null;
  const t = String(raw).trim();
  if (t === '') return null;
  return t.toUpperCase();
}

/**
 * Valor a persistir en `Product.grade` según tipo.
 * - NEW / ACCESSORY → siempre `null`
 * - USED → grado obligatorio y válido
 */
export function resolveGradeForCreate(
  type: ProductType,
  gradeFromDto: string | null | undefined,
): string | null {
  if (type !== ProductType.USED) {
    return null;
  }
  const n = normalizeProductGrade(gradeFromDto);
  if (!n || !isValidUsedGrade(n)) {
    throw new BadRequestException(
      'Los productos usados requieren un grado válido: A+, A o B.',
    );
  }
  return n;
}

/**
 * Actualización: mezcla tipo y grado existentes con el body.
 * @param gradeExplicitlyInDto — `true` si el cliente envió la propiedad `grade` (aunque sea null).
 */
export function resolveGradeForUpdate(
  nextType: ProductType,
  gradeFromDto: string | null | undefined,
  existingGrade: string | null,
  gradeExplicitlyInDto: boolean,
): string | null {
  if (nextType !== ProductType.USED) {
    return null;
  }

  const raw = gradeExplicitlyInDto ? gradeFromDto : existingGrade;
  const n = normalizeProductGrade(raw ?? null);

  if (!n || !isValidUsedGrade(n)) {
    throw new BadRequestException(
      gradeExplicitlyInDto && gradeFromDto === null
        ? 'No se puede dejar el grado vacío en un producto usado.'
        : 'Los productos usados requieren un grado válido: A+, A o B.',
    );
  }
  return n;
}
