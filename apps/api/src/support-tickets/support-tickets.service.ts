import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TicketCategory } from '@prisma/client';

@Injectable()
export class SupportTicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    organiserId: string,
    dto: { subject: string; description: string; category: TicketCategory },
  ) {
    const ticket = await this.prisma.supportTicket.create({
      data: {
        organiserId,
        subject: dto.subject,
        description: dto.description,
        category: dto.category,
      },
      include: {
        organiser: { select: { name: true, email: true, organisation: true } },
      },
    });
    return ticket;
  }

  async listByOrganiser(organiserId: string, page: number, pageSize: number) {
    const skip = (page - 1) * pageSize;
    const [data, totalItems] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where: { organiserId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.supportTicket.count({ where: { organiserId } }),
    ]);
    return {
      data,
      meta: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) },
    };
  }

  async findOneByOrganiser(id: string, organiserId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.organiserId !== organiserId) throw new ForbiddenException('Access denied');
    return ticket;
  }
}
