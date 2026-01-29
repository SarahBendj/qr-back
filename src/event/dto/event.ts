import { Type } from "class-transformer";
import { IsString, IsOptional, IsArray, ValidateNested, IsBoolean, isString, IsEmail } from "class-validator";

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

   @IsString()
   @IsOptional()
   capacity : string;


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
  duration : string;

  @IsOptional()
  @IsString()
  accessCode : string;

  @IsString()
  time: string;

  @IsString()
  contact: string;

  @IsString()
  visibility: string = "public";

  @IsOptional()
  @IsBoolean()
  isPrivate: boolean;

  @IsOptional()
  eventImage?: string | null;

  @IsOptional()
  mapUrl?: string | null;

  @IsOptional()
  pageUrl?: string | null;

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
  @IsString()
  price : string;

  @IsOptional()
  @IsString()
  tags ?: string | string[];
}


export  class JoinEventDTO {
  @IsString()
  fullName : string;
  @IsEmail()
  @IsString()
  email : string ;
}