import { BadRequestException } from '@nestjs/common';
import { ProductCatalogType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

export async function assertProductMetadataMatchesCatalogType(
  prisma: PrismaService,
  catalogType: ProductCatalogType,
  refs: { conditionId?: string | null; gradeId?: string | null },
): Promise<void> {
  if (refs.conditionId) {
    const condition = await prisma.productConditionCatalog.findUnique({
      where: { id: refs.conditionId },
      select: { id: true, name: true, catalogType: true },
    });
    if (!condition) {
      throw new BadRequestException('La condición indicada no existe.');
    }
    if (condition.catalogType !== catalogType) {
      throw new BadRequestException(
        `La condición "${condition.name}" pertenece al catálogo ${condition.catalogType} y no es compatible con un producto ${catalogType}.`,
      );
    }
  }

  if (refs.gradeId) {
    const grade = await prisma.productGrade.findUnique({
      where: { id: refs.gradeId },
      select: { id: true, name: true, catalogType: true },
    });
    if (!grade) {
      throw new BadRequestException('El grado indicado no existe.');
    }
    if (grade.catalogType !== catalogType) {
      throw new BadRequestException(
        `El grado "${grade.name}" pertenece al catálogo ${grade.catalogType} y no es compatible con un producto ${catalogType}.`,
      );
    }
  }
}
