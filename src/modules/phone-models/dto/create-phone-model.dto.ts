import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreatePhoneModelDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'El slug debe ser kebab-case',
  })
  slug: string;

  @IsString()
  @IsNotEmpty()
  brandId: string;
}
