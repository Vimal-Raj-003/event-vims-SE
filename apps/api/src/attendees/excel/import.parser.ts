import * as ExcelJS from 'exceljs';
import { AttendeeRole } from '@prisma/client';
import {
  COLUMNS,
  CATEGORY_TO_ROLE,
  CATEGORY_LABELS,
  EXPECTED_HEADERS,
  TEMPLATE_SHEET_NAME,
  MAX_ROWS,
  type CategoryLabel,
} from './headers';

export type RowErrorReason =
  | 'MISSING_REQUIRED_FIELD'
  | 'INVALID_EMAIL'
  | 'INVALID_CATEGORY'
  | 'FIELD_TOO_LONG'
  | 'INVALID_URL';

export type RowSkipReason = 'ALREADY_REGISTERED' | 'DUPLICATE_IN_FILE';

export interface RowError {
  row: number;
  reason: RowErrorReason;
  field?: string;
  value?: string;
}

export interface RowSkip {
  row: number;
  email: string;
  reason: RowSkipReason;
}

export interface ParsedAttendee {
  row: number;
  email: string; // already lowercased
  firstName: string;
  lastName: string;
  phone: string;
  designation: string;
  company: string;
  industry: string;
  businessType: string;
  city: string;
  linkedinUrl: string | null;
  websiteUrl: string | null;
  profilePhotoUrl: string | null;
  role: AttendeeRole;
}

export interface ParseResult {
  toInsert: ParsedAttendee[];
  skipped: RowSkip[];
  errors: RowError[];
}

export class TemplateError extends Error {
  constructor(
    public readonly code:
      | 'INVALID_TEMPLATE_NO_SHEET'
      | 'INVALID_TEMPLATE_HEADERS'
      | 'TOO_MANY_ROWS',
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'TemplateError';
  }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FIELD_LENGTH = 80;

function readCellString(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' || typeof v === 'boolean') return String(v).trim();
  // ExcelJS may return rich-text or hyperlink objects
  if (typeof v === 'object') {
    const obj = v as { text?: string; richText?: { text: string }[]; hyperlink?: string };
    if (typeof obj.text === 'string') return obj.text.trim();
    if (Array.isArray(obj.richText)) return obj.richText.map((r) => r.text).join('').trim();
    if (typeof obj.hyperlink === 'string') return obj.hyperlink.trim();
  }
  return String(v).trim();
}

function isValidHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function parseImportWorkbook(
  fileBuffer: Buffer,
  existingEmailsLowercased: Set<string>,
): Promise<ParseResult> {
  const workbook = new ExcelJS.Workbook();
  // Cast: ExcelJS .d.ts wants Buffer<ArrayBuffer> but Node Buffers are Buffer<ArrayBufferLike>.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(fileBuffer as any);

  const sheet = workbook.getWorksheet(TEMPLATE_SHEET_NAME);
  if (!sheet) {
    throw new TemplateError(
      'INVALID_TEMPLATE_NO_SHEET',
      `Worksheet "${TEMPLATE_SHEET_NAME}" not found in the uploaded file.`,
    );
  }

  // Header validation — row 1 must match EXPECTED_HEADERS exactly
  const actualHeaders: string[] = [];
  for (let c = 1; c <= EXPECTED_HEADERS.length; c++) {
    actualHeaders.push(readCellString(sheet.getRow(1).getCell(c)));
  }
  const missing = EXPECTED_HEADERS.filter((h) => !actualHeaders.includes(h));
  const extra = actualHeaders.filter((h) => h && !EXPECTED_HEADERS.includes(h));
  if (missing.length > 0 || extra.length > 0) {
    throw new TemplateError(
      'INVALID_TEMPLATE_HEADERS',
      'Header row does not match the expected template.',
      { missing, extra, expected: EXPECTED_HEADERS },
    );
  }

  // Row count guard. sheet.rowCount includes header.
  const dataRowCount = Math.max(0, sheet.actualRowCount - 1);
  if (dataRowCount > MAX_ROWS) {
    throw new TemplateError(
      'TOO_MANY_ROWS',
      `File has ${dataRowCount} data rows. Maximum allowed: ${MAX_ROWS}.`,
      { rowCount: dataRowCount, max: MAX_ROWS },
    );
  }

  const toInsert: ParsedAttendee[] = [];
  const skipped: RowSkip[] = [];
  const errors: RowError[] = [];
  const seenInFile = new Set<string>();

  // Iterate rows 2..end (row 1 is the header)
  for (let r = 2; r <= sheet.actualRowCount; r++) {
    const row = sheet.getRow(r);

    // Read every cell into a keyed object based on COLUMNS ordering
    const raw: Record<string, string> = {};
    COLUMNS.forEach((col, idx) => {
      raw[col.key] = readCellString(row.getCell(idx + 1));
    });

    // Skip completely empty rows (e.g. trailing blanks Excel might keep)
    const anyValue = Object.values(raw).some((v) => v.length > 0);
    if (!anyValue) continue;

    // Required field check
    let missingField: string | undefined;
    for (const col of COLUMNS) {
      if (col.required && !raw[col.key]) {
        missingField = col.header;
        break;
      }
    }
    if (missingField) {
      errors.push({ row: r, reason: 'MISSING_REQUIRED_FIELD', field: missingField });
      continue;
    }

    // Category validation
    const categoryLabel = raw.category as CategoryLabel;
    if (!CATEGORY_LABELS.includes(categoryLabel)) {
      errors.push({ row: r, reason: 'INVALID_CATEGORY', value: raw.category });
      continue;
    }

    // Email validation
    const email = raw.email.toLowerCase();
    if (!EMAIL_REGEX.test(email)) {
      errors.push({ row: r, reason: 'INVALID_EMAIL', value: raw.email });
      continue;
    }

    // Length validation
    let tooLongField: string | undefined;
    for (const col of COLUMNS) {
      if (col.required && raw[col.key].length > MAX_FIELD_LENGTH) {
        tooLongField = col.header;
        break;
      }
    }
    if (tooLongField) {
      errors.push({ row: r, reason: 'FIELD_TOO_LONG', field: tooLongField });
      continue;
    }

    // Optional URL validation
    if (raw.linkedinUrl && !isValidHttpUrl(raw.linkedinUrl)) {
      errors.push({ row: r, reason: 'INVALID_URL', field: 'LinkedIn URL', value: raw.linkedinUrl });
      continue;
    }
    if (raw.websiteUrl && !isValidHttpUrl(raw.websiteUrl)) {
      errors.push({ row: r, reason: 'INVALID_URL', field: 'Website URL', value: raw.websiteUrl });
      continue;
    }
    if (raw.photoUrl && !isValidHttpUrl(raw.photoUrl)) {
      errors.push({ row: r, reason: 'INVALID_URL', field: 'Photo URL', value: raw.photoUrl });
      continue;
    }

    // Duplicate against existing DB
    if (existingEmailsLowercased.has(email)) {
      skipped.push({ row: r, email, reason: 'ALREADY_REGISTERED' });
      continue;
    }

    // Duplicate within this same upload
    if (seenInFile.has(email)) {
      skipped.push({ row: r, email, reason: 'DUPLICATE_IN_FILE' });
      continue;
    }
    seenInFile.add(email);

    toInsert.push({
      row: r,
      email,
      firstName: raw.firstName,
      lastName: raw.lastName,
      phone: raw.phone,
      designation: raw.designation,
      company: raw.company,
      industry: raw.industry,
      businessType: raw.businessType,
      city: raw.city,
      linkedinUrl: raw.linkedinUrl || null,
      websiteUrl: raw.websiteUrl || null,
      profilePhotoUrl: raw.photoUrl || null,
      role: CATEGORY_TO_ROLE[categoryLabel],
    });
  }

  return { toInsert, skipped, errors };
}
