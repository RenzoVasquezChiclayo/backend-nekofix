import { decimalToNumber } from '../../../common/utils/serialize-json';

export function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'bigint') return Number(value);
  if (value == null) return 0;
  return decimalToNumber(value as never) ?? 0;
}
