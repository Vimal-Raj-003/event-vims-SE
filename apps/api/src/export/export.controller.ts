import {
  Controller,
  Get,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';
import { ExportService } from './export.service';

@Controller('events/:eventId/export')
@UseGuards(JwtAuthGuard)
@Roles('ORGANISER')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get()
  async export(
    @Param('eventId') eventId: string,
    @Res() res: Response,
    @CurrentUser() user: CurrentUserData,
  ) {
    const buffer = await this.exportService.generateExcel(
      eventId,
      user.organiserId!,
    );

    const event = await this.exportService.getEventName(eventId);

    const encodedFilename = encodeURIComponent(
      `${event.name} - Export.xlsx`,
    );

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodedFilename}`,
    );
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }
}
