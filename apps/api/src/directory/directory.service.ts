import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';

export interface PublicAttendeeCard {
  id: string;
  firstName: string;
  lastName: string;
  designation: string;
  company: string;
  businessType: string;
  city: string;
  services: string[];
  profilePhotoUrl: string | null;
  companyLogoUrl: string | null;
  connectionStatus: string | null;
}

interface DirectoryQueryParams {
  search?: string;
  businessType?: string;
  industry?: string;
  city?: string;
  services?: string;
  companySize?: string;
  tags?: string;
  page: number;
  pageSize: number;
}

@Injectable()
export class DirectoryService {
  private readonly logger = new Logger(DirectoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAttendees(
    eventId: string,
    user: CurrentUserData,
    query: DirectoryQueryParams,
  ) {
    if (user.eventId !== eventId) {
      throw new ForbiddenException('You do not have access to this event');
    }

    const {
      search,
      businessType,
      industry,
      city,
      services,
      companySize,
      tags,
      page = 1,
      pageSize = 50,
    } = query;

    const safePage = Math.max(1, page);
    const safePageSize = Math.min(100, Math.max(1, pageSize));
    const skip = (safePage - 1) * safePageSize;

    // Build dynamic conditions using raw SQL for ILIKE + JSONB support
    const conditions: string[] = [`a.event_id = $1`];
    const params: unknown[] = [eventId];
    let paramIndex = 2;

    // Search across name, company, and services JSONB
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      conditions.push(`(
        a.first_name ILIKE ${paramIndex}
        OR a.last_name ILIKE ${paramIndex}
        OR a.company ILIKE ${paramIndex}
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(a.services) AS svc
          WHERE svc ILIKE ${paramIndex}
        )
      )`);
      params.push(searchTerm);
      paramIndex++;
    }

    // businessType filter (IN)
    if (businessType) {
      const types = businessType.split(',').map((t) => t.trim()).filter(Boolean);
      if (types.length > 0) {
        conditions.push(`a.business_type = ANY(${paramIndex})`);
        params.push(types);
        paramIndex++;
      }
    }

    // industry filter (IN)
    if (industry) {
      const industries = industry.split(',').map((t) => t.trim()).filter(Boolean);
      if (industries.length > 0) {
        conditions.push(`a.industry = ANY(${paramIndex})`);
        params.push(industries);
        paramIndex++;
      }
    }

    // city filter (IN)
    if (city) {
      const cities = city.split(',').map((t) => t.trim()).filter(Boolean);
      if (cities.length > 0) {
        conditions.push(`a.city = ANY(${paramIndex})`);
        params.push(cities);
        paramIndex++;
      }
    }

    // services filter (JSONB array overlap)
    if (services) {
      const serviceList = services.split(',').map((t) => t.trim()).filter(Boolean);
      if (serviceList.length > 0) {
        conditions.push(`a.services ?| ${paramIndex}`);
        params.push(serviceList);
        paramIndex++;
      }
    }

    // companySize filter (IN)
    if (companySize) {
      const sizes = companySize.split(',').map((t) => t.trim()).filter(Boolean);
      if (sizes.length > 0) {
        conditions.push(`a.company_size = ANY(${paramIndex})`);
        params.push(sizes);
        paramIndex++;
      }
    }

    // tags filter (JSONB array overlap)
    if (tags) {
      const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
      if (tagList.length > 0) {
        conditions.push(`a.tags ?| ${paramIndex}`);
        params.push(tagList);
        paramIndex++;
      }
    }

    // Exclude paused attendees from results
    conditions.push(`a.is_paused = false`);

    // Exclude the requesting user from results
    conditions.push(`a.id != ${paramIndex}`);
    params.push(user.sub);
    paramIndex++;

    const whereClause = conditions.join(' AND ');

    // Count query
    const countResult = await this.prisma.$queryRawUnsafe<
      Array<{ count: bigint }>
    >(
      `SELECT COUNT(*)::bigint as count FROM attendees a WHERE ${whereClause}`,
      ...params,
    );
    const total = Number(countResult[0].count);

    // Data query with connection status subquery
    const dataQuery = `
      SELECT
        a.id,
        a.first_name,
        a.last_name,
        a.designation,
        a.company,
        a.business_type,
        a.city,
        a.services,
        a.profile_photo_url,
        a.company_logo_url,
        COALESCE(cs.status, NULL) as connection_status
      FROM attendees a
      LEFT JOIN LATERAL (
        SELECT cr.status
        FROM connection_requests cr
        WHERE cr.event_id = $1
          AND (
            (cr.sender_id = $${paramIndex - 1} AND cr.receiver_id = a.id)
            OR
            (cr.receiver_id = $${paramIndex - 1} AND cr.sender_id = a.id)
          )
        ORDER BY cr.created_at DESC
        LIMIT 1
      ) cs ON true
      WHERE ${whereClause}
      ORDER BY a.first_name ASC, a.last_name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(safePageSize, skip);

    const rows = await this.prisma.$queryRawUnsafe<
      Array<{
        id: string;
        first_name: string;
        last_name: string;
        designation: string;
        company: string;
        business_type: string;
        city: string;
        services: unknown;
        profile_photo_url: string | null;
        company_logo_url: string | null;
        connection_status: string | null;
      }>
    >(dataQuery, ...params);

    const data: PublicAttendeeCard[] = rows.map((row) => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      designation: row.designation,
      company: row.company,
      businessType: row.business_type,
      city: row.city,
      services: Array.isArray(row.services)
        ? (row.services as string[]).slice(0, 2)
        : [],
      profilePhotoUrl: row.profile_photo_url,
      companyLogoUrl: row.company_logo_url,
      connectionStatus: row.connection_status,
    }));

    this.logger.debug(
      `Directory query for event ${eventId}: ${total} results, page ${safePage}`,
    );

    return {
      data,
      total,
      page: safePage,
      pageSize: safePageSize,
      totalPages: Math.ceil(total / safePageSize),
    };
  }
}
