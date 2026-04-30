import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class OrganiserService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Profile ──────────────────────────────────────────────────────────────

  async getProfile(organiserId: string) {
    const org = await this.prisma.organiser.findUnique({
      where: { id: organiserId },
      select: { id: true, name: true, organisation: true, email: true, mobile: true, status: true, createdAt: true },
    });
    if (!org) throw new NotFoundException('Organiser not found');
    return org;
  }

  async updateProfile(
    organiserId: string,
    dto: { name?: string; organisation?: string; mobile?: string },
  ) {
    const data: Record<string, string> = {};
    if (dto.name) data.name = dto.name;
    if (dto.organisation) data.organisation = dto.organisation;
    if (dto.mobile) data.mobile = dto.mobile;

    const updated = await this.prisma.organiser.update({
      where: { id: organiserId },
      data,
      select: { id: true, name: true, organisation: true, email: true, mobile: true },
    });
    return updated;
  }

  async changePassword(
    organiserId: string,
    dto: { currentPassword: string; newPassword: string },
  ) {
    const org = await this.prisma.organiser.findUnique({
      where: { id: organiserId },
      select: { passwordHash: true },
    });
    if (!org) throw new NotFoundException('Organiser not found');

    const valid = await bcrypt.compare(dto.currentPassword, org.passwordHash);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    const newHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.organiser.update({
      where: { id: organiserId },
      data: { passwordHash: newHash },
    });
    return { message: 'Password updated successfully' };
  }

  // ── Settings ─────────────────────────────────────────────────────────────

  async getSettings(organiserId: string) {
    const settings = await this.prisma.organiserSettings.upsert({
      where: { organiserId },
      create: { organiserId },
      update: {},
    });
    return settings;
  }

  async updateSettings(
    organiserId: string,
    dto: {
      defaultBrandPrimary?: string;
      defaultBrandSecondary?: string;
      defaultMaxConnections?: string;
      defaultShowAddress?: boolean;
      defaultAllowVcard?: boolean;
      notifyAttendeeRegister?: boolean;
      notifyConnectionMilestone?: boolean;
      notifyAnnouncementDelivery?: boolean;
    },
  ) {
    const settings = await this.prisma.organiserSettings.upsert({
      where: { organiserId },
      create: { organiserId, ...dto },
      update: { ...dto },
    });
    return settings;
  }
}
