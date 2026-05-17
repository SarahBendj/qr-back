import { Transform, Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsEmail,
  IsNumber,
  Max,
  Min,
} from 'class-validator';

/** Multipart form-data sends JSON fields and booleans as strings */
function parseJsonField<T>(value: unknown): T | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value === 'object') {
    return value as T;
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function parseJsonArray<T>(value: unknown): T[] | undefined {
  const parsed = parseJsonField<T[]>(value);
  return Array.isArray(parsed) ? parsed : undefined;
}

function parseFormBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return Boolean(value);
}

class LinkDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  url?: string;
}

class ParticipantDto {
  @IsString()
  name: string;

  @IsString()
  role: string;
}

class InstructionDto {
  @IsString()
  rule: string;

  
}

export class CreateEventDto {
  @IsString()
  title: string;

  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) =>
    value === '' || value === undefined || value === null
      ? undefined
      : Number(value),
  )
  @Min(1)
  @Max(1000)
  @IsNumber()
  capacity?: number;

  @IsString()
  description: string;

  @IsString()
  category: string;

  @IsString()
  location: string;

  @IsString()
  date: string;

  @IsOptional()
  @IsString()
  duration?: string;

  @IsOptional()
  @IsString()
  accessCode?: string;

  @IsString()
  time: string;

  @IsString()
  contact: string;

  @IsOptional()
  @IsString()
  visibility?: string;

  @IsOptional()
  @Transform(({ value }) => parseFormBoolean(value))
  @IsBoolean()
  isPrivate?: boolean;

  @IsOptional()
  @IsString()
  eventImage?: string;

  @IsOptional()
  @IsString()
  mapUrl?: string;

  @IsOptional()
  @IsString()
  pageUrl?: string;

  @IsOptional()
  @Transform(({ value }) => parseJsonArray<LinkDto>(value) ?? [])
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LinkDto)
  links?: LinkDto[];

  @IsOptional()
  @Transform(({ value }) => parseJsonArray<ParticipantDto>(value) ?? [])
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParticipantDto)
  participants?: ParticipantDto[];

  @IsOptional()
  @Transform(({ value }) => parseJsonArray<InstructionDto>(value) ?? [])
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InstructionDto)
  instructions?: InstructionDto[];

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  price?: number;

  @IsOptional()
  @IsString()
  tags?: string;
}


export  class JoinEventDTO {
  @IsString()
  fullName : string;
  @IsEmail()
  @IsString()
  email : string ;
}