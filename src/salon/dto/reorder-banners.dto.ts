import { ArrayMaxSize, IsArray, IsString } from 'class-validator';

export class ReorderBannersDto {
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  order: string[];
}
