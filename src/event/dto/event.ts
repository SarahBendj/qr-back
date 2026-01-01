import { Type } from "class-transformer";
import { IsString, IsOptional, IsArray, ValidateNested, IsBoolean } from "class-validator";

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

export class CreateEventDto {
  @IsString()
  title: string;

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
}
