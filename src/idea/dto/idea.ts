import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';

export class CreateIdeaDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  order?: number;

  /** When at max capacity (20), id of the idea to replace. If omitted, the oldest idea is replaced. */
  @IsOptional()
  @IsString()
  replaceIdeaId?: string;
}

export class UpdateIdeaDto extends PartialType(CreateIdeaDto) {}
