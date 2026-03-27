import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEmail,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * DTO for recruiter proposal form (company + mission).
 * Matches frontend: companyName, recruiterName, email, phone, position,
 * salaryMin, salaryMax, startDate, timeline, isCDI, purpose.
 */
export class CreateMissionDto {
  @IsString()
  @MinLength(1, { message: 'Company name is required' })
  companyName: string;

  @IsString()
  @MinLength(1, { message: 'Recruiter name is required' })
  recruiterName: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @MinLength(1, { message: 'Position is required' })
  position: string;

  @IsOptional()
  @IsString()
  salaryMin?: string;

  @IsOptional()
  @IsString()
  salaryMax?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  timeline?: string;

  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  isCDI: boolean;

  @IsOptional()
  @IsString()
  purpose?: string;
}
