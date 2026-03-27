import { IsString, IsOptional, MinLength } from 'class-validator';

/**
 * DTO for recruiter cancelling their mission via email link (no login).
 */
export class CancelMissionByRecruiterDto {
  @IsString()
  @MinLength(1, { message: 'Token is required' })
  token: string;

  @IsOptional()
  @IsString()
  justification?: string;
}
