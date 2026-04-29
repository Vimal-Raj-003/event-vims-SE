export const ATTENDEE_PROFILE_FIELDS = [
  { key: 'firstName', label: 'First Name', required: true, alwaysRequired: true },
  { key: 'lastName', label: 'Last Name', required: true, alwaysRequired: true },
  { key: 'email', label: 'Email', required: true, alwaysRequired: true },
  { key: 'phone', label: 'Phone', required: true, hidden: true },
  { key: 'designation', label: 'Designation', required: true },
  { key: 'company', label: 'Company', required: true },
  { key: 'businessType', label: 'Business Type', required: true },
  { key: 'industry', label: 'Industry', required: true },
  { key: 'services', label: 'Services Offered', required: true },
  { key: 'city', label: 'City', required: true },
  { key: 'address', label: 'Address', required: false, hidden: true },
  { key: 'companySize', label: 'Company Size', required: false },
  { key: 'tags', label: 'Tags', required: false },
  { key: 'profilePhotoUrl', label: 'Profile Photo', required: false },
  { key: 'companyLogoUrl', label: 'Company Logo', required: false },
] as const;

export const COMPANY_SIZE_OPTIONS = [
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '500+',
] as const;

export const OTP_CONFIG = {
  LENGTH: 6,
  TTL_MINUTES: 10,
  MAX_ATTEMPTS_PER_OTP: 3,
  RATE_LIMIT_PER_HOUR: 3,
} as const;

export const JWT_CONFIG = {
  ACCESS_TOKEN_TTL: '15m',
  REFRESH_TOKEN_TTL: '7d',
} as const;

export const RATE_LIMITS = {
  PUBLIC_ENDPOINTS: 100,
  AUTHENTICATED_ENDPOINTS: 1000,
  OTP_PER_EMAIL_PER_HOUR: 3,
  CONNECTION_REQUESTS_PER_HOUR: 50,
} as const;

export const FILE_UPLOAD_LIMITS = {
  LOGO_MAX_SIZE_MB: 2,
  BANNER_MAX_SIZE_MB: 5,
  ALLOWED_IMAGE_TYPES: ['image/png', 'image/jpeg', 'image/jpg'],
} as const;

export const QR_CONFIG = {
  SHORT_HASH_LENGTH: 8,
  PNG_SIZE: 1024,
  PNG_DPI: 300,
  ERROR_CORRECTION_LEVEL: 'H' as const,
} as const;

export const VCARD_VERSION = '3.0';

export const BUSINESS_TYPES = [
  'Technology',
  'Manufacturing',
  'Healthcare',
  'Finance',
  'Education',
  'Real Estate',
  'Retail',
  'Automotive',
  'Food & Beverage',
  'Consulting',
  'Marketing',
  'Logistics',
  'Construction',
  'Energy',
  'Media',
  'Legal',
  'Other',
] as const;

export const INDUSTRIES = [
  'IT Services',
  'Software',
  'Hardware',
  'E-commerce',
  'FinTech',
  'EdTech',
  'HealthTech',
  'PropTech',
  'AgriTech',
  'Logistics',
  'Pharmaceuticals',
  'Textiles',
  'Automotive',
  'Aerospace',
  'FMCG',
  'BFSI',
  'Government',
  'NGO',
  'Other',
] as const;

export const DATA_RETENTION = {
  DEFAULT_MONTHS_POST_EVENT: 12,
  DELETION_COOLING_PERIOD_DAYS: 30,
} as const;
