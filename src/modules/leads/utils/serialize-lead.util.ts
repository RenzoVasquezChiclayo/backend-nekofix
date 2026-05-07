import { Lead, Prisma } from '@prisma/client';
import { decimalToNumber } from '../../../common/utils/serialize-json';

export type LeadWithConfirmer = Lead & {
  confirmedBy?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
};

export function serializeLead<T extends LeadWithConfirmer>(lead: T) {
  return {
    ...lead,
    total: decimalToNumber(lead.total as unknown as Prisma.Decimal),
  };
}

export function serializeLeads<T extends LeadWithConfirmer>(rows: T[]) {
  return rows.map((row) => serializeLead(row));
}
