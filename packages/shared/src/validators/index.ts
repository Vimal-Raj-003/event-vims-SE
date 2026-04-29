import { z } from 'zod';

export const organiserSignupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  organisation: z.string().min(2, 'Organisation name is required').max(200),
  email: z.string().email('Invalid email address'),
  mobile: z.string().regex(/^[+]?[\d\s-]{8,15}$/, 'Invalid phone number'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
});

export const organiserLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const otpVerifySchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  purpose: z.enum(['organiser_signup', 'organiser_login', 'attendee_login']),
});

export const attendeeRegisterSchema = z.object({
  eventSlug: z.string().min(1, 'Event slug is required'),
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^[+]?[\d\s-]{8,15}$/, 'Invalid phone number'),
  designation: z.string().min(1, 'Designation is required').max(100),
  company: z.string().min(1, 'Company is required').max(200),
  businessType: z.string().min(1, 'Business type is required'),
  industry: z.string().min(1, 'Industry is required'),
  services: z.array(z.string()).min(1, 'At least one service is required'),
  city: z.string().min(1, 'City is required').max(100),
  address: z.string().max(500).optional(),
  companySize: z.string().optional(),
  tags: z.array(z.string()).max(10, 'Maximum 10 tags allowed').optional(),
  consentGiven: z.literal(true, { message: 'You must consent to data processing' }),
});

export const createEventSchema = z.object({
  name: z.string().min(3, 'Event name must be at least 3 characters').max(80),
  description: z.string().min(1, 'Description is required').max(500),
  startAt: z.string().datetime('Invalid start date'),
  endAt: z.string().datetime('Invalid end date'),
  venue: z.string().min(1, 'Venue is required').max(500),
  venueMapUrl: z.string().url('Invalid URL').optional(),
  expectedCount: z.number().int().positive().optional(),
  brandPrimary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').default('#4F46E5'),
  brandSecondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').default('#818CF8'),
});

export const sendConnectionRequestSchema = z.object({
  receiverId: z.string().min(1, 'Receiver ID is required'),
  message: z.string().max(200, 'Message must be under 200 characters').optional(),
});

export const announcementSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  body: z.string().min(1, 'Body is required').max(500),
  linkUrl: z.string().url('Invalid URL').optional(),
});

export const directoryFilterSchema = z.object({
  search: z.string().optional(),
  businessType: z.array(z.string()).optional(),
  industry: z.array(z.string()).optional(),
  city: z.array(z.string()).optional(),
  services: z.array(z.string()).optional(),
  companySize: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
});

export type OrganiserSignupInput = z.infer<typeof organiserSignupSchema>;
export type OrganiserLoginInput = z.infer<typeof organiserLoginSchema>;
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;
export type AttendeeRegisterInput = z.infer<typeof attendeeRegisterSchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type SendConnectionRequestInput = z.infer<typeof sendConnectionRequestSchema>;
export type AnnouncementInput = z.infer<typeof announcementSchema>;
export type DirectoryFilterInput = z.infer<typeof directoryFilterSchema>;
