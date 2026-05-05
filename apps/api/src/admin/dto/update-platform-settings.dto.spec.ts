import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdatePlatformSettingsDto } from './update-platform-settings.dto';

const validateDto = async (input: unknown) => {
  const instance = plainToInstance(UpdatePlatformSettingsDto, input);
  const errors = await validate(instance as object);
  return errors;
};

describe('UpdatePlatformSettingsDto', () => {
  it('accepts an empty object (all fields optional)', async () => {
    expect(await validateDto({})).toHaveLength(0);
  });

  it('accepts a valid full payload', async () => {
    expect(
      await validateDto({
        platformName: 'My Platform',
        supportEmail: 'help@example.com',
        dataRetentionMonths: 24,
        allowOrganiserSelfSignup: false,
        cardToCardQrConnections: false,
        crossEventNetworks: false,
        multiLanguageSupport: false,
      }),
    ).toHaveLength(0);
  });

  it('rejects empty platformName', async () => {
    const errors = await validateDto({ platformName: '' });
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('platformName');
  });

  it('rejects platformName over 100 chars', async () => {
    const errors = await validateDto({ platformName: 'a'.repeat(101) });
    expect(errors).toHaveLength(1);
  });

  it('rejects invalid supportEmail', async () => {
    const errors = await validateDto({ supportEmail: 'not-an-email' });
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('supportEmail');
  });

  it('rejects dataRetentionMonths < 1', async () => {
    const errors = await validateDto({ dataRetentionMonths: 0 });
    expect(errors).toHaveLength(1);
  });

  it('rejects dataRetentionMonths > 120', async () => {
    const errors = await validateDto({ dataRetentionMonths: 121 });
    expect(errors).toHaveLength(1);
  });

  it('rejects setting cardToCardQrConnections to true', async () => {
    const errors = await validateDto({ cardToCardQrConnections: true });
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('cardToCardQrConnections');
  });

  it('rejects setting crossEventNetworks to true', async () => {
    const errors = await validateDto({ crossEventNetworks: true });
    expect(errors).toHaveLength(1);
  });

  it('rejects setting multiLanguageSupport to true', async () => {
    const errors = await validateDto({ multiLanguageSupport: true });
    expect(errors).toHaveLength(1);
  });
});
