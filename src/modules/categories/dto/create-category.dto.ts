import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'El slug debe ser kebab-case',
  })
  slug: string;

  @IsOptional()
  @IsString()
  icon?: string;
}
