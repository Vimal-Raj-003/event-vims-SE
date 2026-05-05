import {
  Equals,
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdatePlatformSettingsDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  platformName?: string;

  @IsOptional()
  @IsEmail()
  supportEmail?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  dataRetentionMonths?: number;

  @IsOptional()
  @IsBoolean()
  allowOrganiserSelfSignup?: boolean;

  @IsOptional()
  @IsBoolean()
  @Equals(false, { message: 'cardToCardQrConnections is not yet available' })
  cardToCardQrConnections?: boolean;

  @IsOptional()
  @IsBoolean()
  @Equals(false, { message: 'crossEventNetworks is not yet available' })
  crossEventNetworks?: boolean;

  @IsOptional()
  @IsBoolean()
  @Equals(false, { message: 'multiLanguageSupport is not yet available' })
  multiLanguageSupport?: boolean;
}
