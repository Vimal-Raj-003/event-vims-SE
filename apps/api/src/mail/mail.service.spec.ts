import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { PlatformSettingsService } from '../admin/platform-settings.service';

describe('MailService - branding', () => {
  let service: MailService;
  let platformSettings: { get: jest.Mock };

  beforeEach(async () => {
    platformSettings = {
      get: jest.fn().mockResolvedValue({ platformName: 'Acme Events' }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        MailService,
        { provide: PlatformSettingsService, useValue: platformSettings },
        {
          provide: ConfigService,
          useValue: {
            get: (k: string) => {
              if (k === 'MAIL_USERNAME') return 'noreply@x.com';
              return undefined;
            },
          },
        },
      ],
    }).compile();

    service = moduleRef.get(MailService);
  });

  it('buildFromHeader uses platformName from settings', async () => {
    expect(await service.buildFromHeader()).toBe('"Acme Events" <noreply@x.com>');
  });

  it('buildFromHeader falls back to "VIMS Events" if settings throw', async () => {
    platformSettings.get.mockRejectedValue(new Error('db down'));
    expect(await service.buildFromHeader()).toBe('"VIMS Events" <noreply@x.com>');
  });

  it('formatSubject prefixes non-OTP subjects with [platformName]', async () => {
    expect(await service.formatSubject('Welcome', false)).toBe('[Acme Events] Welcome');
  });

  it('formatSubject does NOT prefix OTP subjects', async () => {
    expect(await service.formatSubject('Your OTP: 1234', true)).toBe('Your OTP: 1234');
  });

  it('formatSubject falls back to raw subject if settings throw', async () => {
    platformSettings.get.mockRejectedValue(new Error('db down'));
    expect(await service.formatSubject('Welcome', false)).toBe('Welcome');
  });
});
