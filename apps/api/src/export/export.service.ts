import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generateExcel(
    eventId: string,
    organiserId: string,
  ): Promise<Buffer> {
    await this.verifyEventOwnership(eventId, organiserId);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'VIMS Event Platform';
    workbook.created = new Date();

    await this.writeAttendeesSheet(workbook, eventId);
    await this.writeConnectionsSheet(workbook, eventId);
    await this.writeEngagementSummarySheet(workbook, eventId);
    await this.writeAnnouncementLogSheet(workbook, eventId);

    const buffer = await workbook.xlsx.writeBuffer();
    this.logger.log(`Excel export generated for event ${eventId}`);
    return Buffer.from(buffer);
  }

  async getEventName(eventId: string): Promise<{ name: string }> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { name: true },
    });

    if (!event) {
      throw new NotFoundException(`Event with id "${eventId}" not found`);
    }

    return event;
  }

  // ─── Sheet Builders ─────────────────────────────────────

  private async writeAttendeesSheet(
    workbook: ExcelJS.Workbook,
    eventId: string,
  ): Promise<void> {
    const sheet = workbook.addWorksheet('Attendees');

    sheet.columns = [
      { header: 'First Name', key: 'firstName', width: 18 },
      { header: 'Last Name', key: 'lastName', width: 18 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 18 },
      { header: 'Designation', key: 'designation', width: 22 },
      { header: 'Company', key: 'company', width: 24 },
      { header: 'Business Type', key: 'businessType', width: 18 },
      { header: 'Industry', key: 'industry', width: 20 },
      { header: 'Services', key: 'services', width: 30 },
      { header: 'City', key: 'city', width: 18 },
      { header: 'Address', key: 'address', width: 28 },
      { header: 'Company Size', key: 'companySize', width: 16 },
      { header: 'Tags', key: 'tags', width: 28 },
      { header: 'Registered At', key: 'registeredAt', width: 22 },
    ];

    this.styleHeaderRow(sheet);

    const attendees = await this.prisma.attendee.findMany({
      where: { eventId },
      orderBy: { registeredAt: 'asc' },
    });

    for (const a of attendees) {
      sheet.addRow({
        firstName: a.firstName,
        lastName: a.lastName,
        email: a.email,
        phone: a.phone,
        designation: a.designation,
        company: a.company,
        businessType: a.businessType,
        industry: a.industry,
        services: this.jsonArrayToString(a.services),
        city: a.city,
        address: a.address ?? '',
        companySize: a.companySize ?? '',
        tags: this.jsonArrayToString(a.tags),
        registeredAt: this.formatDate(a.registeredAt),
      });
    }
  }

  private async writeConnectionsSheet(
    workbook: ExcelJS.Workbook,
    eventId: string,
  ): Promise<void> {
    const sheet = workbook.addWorksheet('Connections');

    sheet.columns = [
      { header: 'Sender Name', key: 'senderName', width: 26 },
      { header: 'Sender Company', key: 'senderCompany', width: 24 },
      { header: 'Receiver Name', key: 'receiverName', width: 26 },
      { header: 'Receiver Company', key: 'receiverCompany', width: 24 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Sent At', key: 'sentAt', width: 22 },
      { header: 'Responded At', key: 'respondedAt', width: 22 },
    ];

    this.styleHeaderRow(sheet);

    const connections = await this.prisma.connectionRequest.findMany({
      where: { eventId },
      include: {
        sender: {
          select: { firstName: true, lastName: true, company: true },
        },
        receiver: {
          select: { firstName: true, lastName: true, company: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    for (const c of connections) {
      sheet.addRow({
        senderName: `${c.sender.firstName} ${c.sender.lastName}`,
        senderCompany: c.sender.company,
        receiverName: `${c.receiver.firstName} ${c.receiver.lastName}`,
        receiverCompany: c.receiver.company,
        status: c.status,
        sentAt: this.formatDate(c.createdAt),
        respondedAt: c.respondedAt ? this.formatDate(c.respondedAt) : '',
      });
    }
  }

  private async writeEngagementSummarySheet(
    workbook: ExcelJS.Workbook,
    eventId: string,
  ): Promise<void> {
    const sheet = workbook.addWorksheet('Engagement Summary');

    sheet.columns = [
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Company', key: 'company', width: 26 },
      { header: 'Requests Sent', key: 'requestsSent', width: 16 },
      { header: 'Requests Received', key: 'requestsReceived', width: 18 },
      { header: 'Connections Accepted', key: 'connectionsAccepted', width: 22 },
    ];

    this.styleHeaderRow(sheet);

    const attendees = await this.prisma.attendee.findMany({
      where: { eventId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        company: true,
        sentConnections: { select: { status: true } },
        receivedConnections: { select: { status: true } },
      },
      orderBy: { firstName: 'asc' },
    });

    for (const a of attendees) {
      const requestsSent = a.sentConnections.length;
      const requestsReceived = a.receivedConnections.length;
      const connectionsAccepted =
        a.sentConnections.filter((c) => c.status === 'ACCEPTED').length +
        a.receivedConnections.filter((c) => c.status === 'ACCEPTED').length;

      sheet.addRow({
        name: `${a.firstName} ${a.lastName}`,
        company: a.company,
        requestsSent,
        requestsReceived,
        connectionsAccepted,
      });
    }
  }

  private async writeAnnouncementLogSheet(
    workbook: ExcelJS.Workbook,
    eventId: string,
  ): Promise<void> {
    const sheet = workbook.addWorksheet('Announcement Log');

    sheet.columns = [
      { header: 'Title', key: 'title', width: 36 },
      { header: 'Body', key: 'body', width: 50 },
      { header: 'Sent At', key: 'sentAt', width: 22 },
      { header: 'Recipient Count', key: 'recipientCount', width: 18 },
    ];

    this.styleHeaderRow(sheet);

    const announcements = await this.prisma.announcement.findMany({
      where: { eventId },
      orderBy: { sentAt: 'desc' },
    });

    for (const ann of announcements) {
      sheet.addRow({
        title: ann.title,
        body: ann.body,
        sentAt: this.formatDate(ann.sentAt),
        recipientCount: ann.recipientCount,
      });
    }
  }

  // ─── Helpers ────────────────────────────────────────────

  private styleHeaderRow(sheet: ExcelJS.Worksheet): void {
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' },
    };
    headerRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
    headerRow.commit();
  }

  private jsonArrayToString(value: unknown): string {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed.join(', ');
        }
      } catch {
        return value;
      }
    }
    return '';
  }

  private formatDate(date: Date): string {
    return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
  }

  private async verifyEventOwnership(
    eventId: string,
    organiserId: string,
  ): Promise<void> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { organiserId: true },
    });

    if (!event) {
      throw new NotFoundException(`Event with id "${eventId}" not found`);
    }

    if (event.organiserId !== organiserId) {
      throw new ForbiddenException(
        'You do not have permission to export data for this event',
      );
    }
  }
}
