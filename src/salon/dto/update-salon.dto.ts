import {
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';

export const SALON_PAGE_THEMES = ['dark', 'light'] as const;
export type SalonPageTheme = (typeof SALON_PAGE_THEMES)[number];

const MARK_REGEX = /^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$/;

export class UpdateSalonDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(MARK_REGEX, {
    message: 'mark must be 3–63 lowercase letters, numbers, or hyphens',
  })
  mark?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  tagline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  aboutText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  accentColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  accentColor2?: string;

  @IsOptional()
  @IsString()
  @IsIn(SALON_PAGE_THEMES)
  pageTheme?: SalonPageTheme;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  referenceName?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsEmail({}, { each: true })
  contactEmails?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(240)
  footerAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  footerPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  footerWebsite?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  footerLegal?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  bannerKeys?: string[];
}
