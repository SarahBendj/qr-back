import { IsEmail, IsOptional, IsString, IsBoolean } from 'class-validator';

export class GoogleLoginDto {
  @IsString()
  id: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  picture?: string;

  @IsOptional()
  @IsBoolean()
  userConsented?: boolean;
}
