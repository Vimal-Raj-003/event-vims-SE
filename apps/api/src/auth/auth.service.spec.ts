import { Test } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ClsService } from 'nestjs-cls';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { PlatformSettingsService } from '../admin/platform-settings.service';

describe('AuthService — organiser signup gate', () => {
  let service: AuthService;
  let platformSettings: { get: jest.Mock; getPublic: jest.Mock; update: jest.Mock };
  let prisma: {
    organiser: { findUnique: jest.Mock; create: jest.Mock };
    otpVerification: { create: jest.Mock };
  };
  let mailService: { sendVerificationEmail: jest.Mock };
  let configService: { get: jest.Mock };
  let jwtService: { signAsync: jest.Mock; verify: jest.Mock };

  const validDto = {
    email: 'jane@acme.com',
    password: 'SecurePass123',
    name: 'Jane Doe',
    organisation: 'Acme',
    mobile: '+1 555 0100',
  };

  beforeEach(async () => {
    platformSettings = {
      get: jest.fn(),
      getPublic: jest.fn(),
      update: jest.fn(),
    };
    prisma = {
      organiser: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      otpVerification: {
        create: jest.fn(),
      },
    };
    mailService = {
      sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    };
    configService = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        if (key === 'BCRYPT_SALT_ROUNDS') return 4; // fast bcrypt for tests
        if (key === 'NODE_ENV') return 'test';
        return defaultValue;
      }),
    };
    jwtService = {
      signAsync: jest.fn(),
      verify: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: ClsService, useValue: {} },
        { provide: MailService, useValue: mailService },
        { provide: PlatformSettingsService, useValue: platformSettings },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('rejects signup with ForbiddenException when allowOrganiserSelfSignup is false', async () => {
    platformSettings.get.mockResolvedValue({ allowOrganiserSelfSignup: false });

    await expect(service.organiserSignup(validDto)).rejects.toThrow(
      ForbiddenException,
    );

    // Critical: the gate runs BEFORE any email-existence lookup, so we don't
    // leak whether an account exists for that email when signup is disabled.
    expect(prisma.organiser.findUnique).not.toHaveBeenCalled();
    expect(prisma.organiser.create).not.toHaveBeenCalled();
    expect(mailService.sendVerificationEmail).not.toHaveBeenCalled();
  });

  it('proceeds past the gate when allowOrganiserSelfSignup is true', async () => {
    platformSettings.get.mockResolvedValue({ allowOrganiserSelfSignup: true });
    prisma.organiser.findUnique.mockResolvedValue(null);
    prisma.organiser.create.mockResolvedValue({
      id: 'org-1',
      email: validDto.email.toLowerCase(),
    });
    prisma.otpVerification.create.mockResolvedValue({ id: 'otp-1' });

    const result = await service.organiserSignup(validDto);

    expect(result.email).toBe(validDto.email.toLowerCase());
    expect(prisma.organiser.findUnique).toHaveBeenCalled();
    expect(prisma.organiser.create).toHaveBeenCalled();
    expect(mailService.sendVerificationEmail).toHaveBeenCalled();
  });
});
