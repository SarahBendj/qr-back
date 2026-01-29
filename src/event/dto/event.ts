import { Type } from "class-transformer";
import { IsString, IsOptional, IsArray, ValidateNested, IsBoolean, isString, IsEmail, IsNumber } from "class-validator";

class LinkDto {
  @IsString()
  title: string;

  @IsString()
  url: string;
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
  @IsNumber()
  @Type(() => Number)
  capacity?: number;

  @IsString()
  description: string;

  @IsString()
  category: string;

  @IsString()
  location: string;

  @IsDateString()
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
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LinkDto)
  links?: LinkDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParticipantDto)
  participants?: ParticipantDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InstructionDto)
  instructions?: InstructionDto[];

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  price?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}


export  class JoinEventDTO {
  @IsString()
  fullName : string;
  @IsEmail()
  @IsString()
  email : string ;
}