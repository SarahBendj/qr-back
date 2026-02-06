import { IsString, IsOptional, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';


class LinkDto {
  @IsString()
  title: string;

  @IsString()
  url: string;
}

export class CreateCandidateDto {
  @IsString()
  firstname: string;

  @IsString()
  lastname: string;

  @IsString()
  country: string;

  @IsString()
  address: string;
  
  @IsString()
  model: 'STANDARD' | 'PORTFOLIO';


  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  nindo?: string;

  @IsOptional()
  @IsBoolean()
  isPrivate: boolean;


  @IsOptional()
  @IsString()
  cvUrl?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  /** Accepts JSON string (e.g. from form data) or array: '[{"title":"GitHub","url":"https://..."}]' or [{ title, url }] */
  @IsOptional()
  @Transform(({ value }) => {
    if (value == null) return value;
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return [];
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : value;
      } catch {
        return value;
      }
    }
    return value;
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LinkDto)
  links?: LinkDto[];
}

export class UpdateCandidateDto extends PartialType(CreateCandidateDto) {}





//*portfolio DTOs*/
export class CreatePortfolioDto {
  @IsString()
  candidateSlug: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  tag: string;

  @IsString()
  link: string;

  @IsOptional()
  @IsString()
  image?: string;


}

export class UpdatePortfolioDto extends PartialType(CreatePortfolioDto) {}

export class CreateProjectDto {
  @IsString()
  portfolioSlug: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  tag: string;
}

export class UpdateProjectDto extends PartialType(CreateProjectDto) {}

export interface UpdateAboutDto {
  bio?: string;
  skill: string [];
}

export interface SoftSkillDto {
  id?: string;  
  skill: string;
}
