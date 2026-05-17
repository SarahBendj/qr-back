import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class ContactDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  topic: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  message: string;
}
