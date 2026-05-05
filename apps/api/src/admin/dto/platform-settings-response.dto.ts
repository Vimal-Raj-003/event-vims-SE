export class PlatformSettingsResponseDto {
  id!: string;
  platformName!: string;
  supportEmail!: string;
  dataRetentionMonths!: number;
  allowOrganiserSelfSignup!: boolean;
  cardToCardQrConnections!: boolean;
  crossEventNetworks!: boolean;
  multiLanguageSupport!: boolean;
  updatedAt!: Date;
  updatedBy!: string | null;
}
