import { IsDateString, IsIn, IsOptional } from 'class-validator';

export class ReportDateRangeDto {
  @IsOptional()
  @IsIn(['7d', '30d', 'this-month', 'custom'])
  preset?: '7d' | '30d' | 'this-month' | 'custom';

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
