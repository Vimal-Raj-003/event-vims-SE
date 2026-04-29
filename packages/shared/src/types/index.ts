export type UserRole = 'SUPER_ADMIN' | 'ORGANISER' | 'ATTENDEE';
export type OrganiserStatus = 'ACTIVE' | 'SUSPENDED';
export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'DELETED';
export type ConnectionStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN';
export type DeletionRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSING' | 'COMPLETED';

export interface JwtPayload {
  sub: string;
  role: UserRole;
  email: string;
  eventId?: string;
  attendeeId?: string;
  organiserId?: string;
  iat: number;
  exp: number;
}

export interface Organiser {
  id: string;
  name: string;
  organisation: string;
  email: string;
  mobile: string;
  status: OrganiserStatus;
  emailVerifiedAt: string | null;
  createdAt: string;
}

export interface Event {
  id: string;
  organiserId: string;
  slug: string;
  shortHash: string;
  name: string;
  description: string;
  startAt: string;
  endAt: string;
  venue: string;
  venueMapUrl: string | null;
  expectedCount: number | null;
  brandLogoUrl: string | null;
  brandPrimary: string;
  brandSecondary: string;
  bannerUrl: string | null;
  qrUrl: string | null;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EventFieldConfig {
  id: string;
  eventId: string;
  fieldKey: string;
  isRequired: boolean;
  isVisible: boolean;
}

export interface EventRule {
  id: string;
  eventId: string;
  maxConnectionsPerAttendee: string | null;
  showAddressAfterAccept: boolean;
  allowVcardDownload: boolean;
}

export interface Attendee {
  id: string;
  eventId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  designation: string;
  company: string;
  businessType: string;
  industry: string;
  services: string[];
  city: string;
  address: string | null;
  companySize: string | null;
  tags: string[];
  profilePhotoUrl: string | null;
  companyLogoUrl: string | null;
  registeredAt: string;
  isPaused: boolean;
}

export interface ConnectionRequest {
  id: string;
  eventId: string;
  senderId: string;
  receiverId: string;
  status: ConnectionStatus;
  message: string | null;
  createdAt: string;
  respondedAt: string | null;
}

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
  connectionStatus: ConnectionStatus | null;
}

export interface ConnectedAttendeeCard extends PublicAttendeeCard {
  email: string;
  phone: string;
  address: string | null;
}

export interface Announcement {
  id: string;
  eventId: string;
  title: string;
  body: string;
  linkUrl: string | null;
  sentAt: string;
  recipientCount: number;
  openedCount: number;
}

export interface EventLiveStats {
  attendeeCount: number;
  connectionsSent: number;
  connectionsAccepted: number;
  acceptanceRate: number;
  activeUsers5m: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DirectoryFilters {
  search?: string;
  businessType?: string[];
  industry?: string[];
  city?: string[];
  services?: string[];
  companySize?: string[];
  tags?: string[];
}

export interface ExportSheets {
  attendees: Attendee[];
  connections: ConnectionRequest[];
  engagementSummary: {
    attendeeId: string;
    name: string;
    requestsSent: number;
    requestsReceived: number;
    connectionsAccepted: number;
  }[];
  announcementLog: Announcement[];
}
