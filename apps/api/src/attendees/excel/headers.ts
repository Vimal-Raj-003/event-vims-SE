import { AttendeeRole } from '@prisma/client';

export const TEMPLATE_SHEET_NAME = 'Attendees';
export const INSTRUCTIONS_SHEET_NAME = '_Instructions';

export const MAX_ROWS = 1000;
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export const CATEGORY_LABELS = [
  'Attendee',
  'Sponsor',
  'Key Speaker',
  'Key Organizer',
] as const;
export type CategoryLabel = (typeof CATEGORY_LABELS)[number];

export const CATEGORY_TO_ROLE: Record<CategoryLabel, AttendeeRole> = {
  Attendee: AttendeeRole.ATTENDEE,
  Sponsor: AttendeeRole.SPONSOR,
  'Key Speaker': AttendeeRole.KEY_SPEAKER,
  'Key Organizer': AttendeeRole.KEY_ORGANIZER,
};

export interface ColumnSpec {
  key: string;
  header: string;
  width: number;
  required: boolean;
}

export const COLUMNS: ColumnSpec[] = [
  { key: 'category',     header: 'Category',      width: 16, required: true  },
  { key: 'firstName',    header: 'First Name',    width: 18, required: true  },
  { key: 'lastName',     header: 'Last Name',     width: 18, required: true  },
  { key: 'email',        header: 'Email',         width: 30, required: true  },
  { key: 'phone',        header: 'Phone',         width: 18, required: true  },
  { key: 'designation',  header: 'Designation',   width: 22, required: true  },
  { key: 'company',      header: 'Company',       width: 24, required: true  },
  { key: 'industry',     header: 'Industry',      width: 22, required: true  },
  { key: 'businessType', header: 'Business Type', width: 18, required: true  },
  { key: 'city',         header: 'City',          width: 16, required: true  },
  { key: 'linkedinUrl',  header: 'LinkedIn URL',  width: 32, required: false },
  { key: 'websiteUrl',   header: 'Website URL',   width: 32, required: false },
  { key: 'photoUrl',     header: 'Photo URL',     width: 32, required: false },
];

export const EXPECTED_HEADERS: string[] = COLUMNS.map((c) => c.header);

export const SAMPLE_ROWS: Record<string, string>[] = [
  {
    category: 'Sponsor',
    firstName: 'Priya',
    lastName: 'Sharma',
    email: 'priya.sharma@acme.example.com',
    phone: '+91 98765 43210',
    designation: 'CEO',
    company: 'Acme Inc',
    industry: 'Technology',
    businessType: 'B2B',
    city: 'Bangalore',
    linkedinUrl: 'https://www.linkedin.com/in/priya-sharma',
    websiteUrl: 'https://acme.example.com',
    photoUrl: '',
  },
  {
    category: 'Key Speaker',
    firstName: 'Rahul',
    lastName: 'Verma',
    email: 'rahul.verma@xyz.example.io',
    phone: '+91 99887 76655',
    designation: 'VP Engineering',
    company: 'XYZ Labs',
    industry: 'AI / ML',
    businessType: 'Enterprise',
    city: 'Hyderabad',
    linkedinUrl: '',
    websiteUrl: '',
    photoUrl: '',
  },
  {
    category: 'Attendee',
    firstName: 'Meera',
    lastName: 'Iyer',
    email: 'meera.iyer@startup.example.in',
    phone: '+91 97654 32109',
    designation: 'Product Manager',
    company: 'Startup Co',
    industry: 'SaaS',
    businessType: 'B2C',
    city: 'Pune',
    linkedinUrl: '',
    websiteUrl: '',
    photoUrl: '',
  },
];

export const INSTRUCTIONS_TEXT = [
  'How to use this template:',
  '',
  '1. Do NOT rename or reorder the column headers in row 1 of the Attendees sheet.',
  '2. Use the dropdown in the Category column to pick one of: Attendee, Sponsor, Key Speaker, Key Organizer.',
  `3. Required columns: ${COLUMNS.filter((c) => c.required).map((c) => c.header).join(', ')}.`,
  '4. Leave optional cells blank if you do not have the data.',
  `5. Maximum ${MAX_ROWS} rows per upload. Maximum file size 5 MB.`,
  '6. Delete the three sample rows before uploading your real list.',
  '7. Imported attendees do NOT receive an email. They appear in the directory immediately and can log in via the normal email-OTP flow when they choose to.',
];
