import { BadRequestException } from '@nestjs/common';

export type DateRange = {
  startDate: Date;
  endDate: Date;
};

export function resolveDateRange(input: {
  preset?: '7d' | '30d' | 'this-month' | 'custom';
  startDate?: string;
  endDate?: string;
}): DateRange {
  const now = new Date();
  const providedStart = input.startDate ? new Date(input.startDate) : undefined;
  const providedEnd = input.endDate ? new Date(input.endDate) : undefined;

  if (providedStart && Number.isNaN(providedStart.getTime())) {
    throw new BadRequestException('startDate inválido');
  }
  if (providedEnd && Number.isNaN(providedEnd.getTime())) {
    throw new BadRequestException('endDate inválido');
  }
  if (providedStart && providedEnd && providedStart > providedEnd) {
    throw new BadRequestException('startDate no puede ser mayor a endDate');
  }

  const preset = input.preset ?? '30d';

  if (preset === 'custom') {
    if (providedStart && providedEnd) {
      return { startDate: providedStart, endDate: providedEnd };
    }
    // custom incompleto: fallback a 30 días
    return {
      startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      endDate: now,
    };
  }

  if (providedStart && providedEnd) {
    return { startDate: providedStart, endDate: providedEnd };
  }

  if (preset === '7d') {
    return {
      startDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      endDate: now,
    };
  }

  if (preset === 'this-month') {
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return { startDate: startMonth, endDate: now };
  }

  // default 30d (incluye ausencia total de filtros)
  return {
    startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    endDate: now,
  };
}

export function toPrismaDateRange(range: DateRange) {
  return { gte: range.startDate, lte: range.endDate };
}
