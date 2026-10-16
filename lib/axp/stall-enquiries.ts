import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { saveStallEnquiryFirestore, getAllStallEnquiriesFirestore } from './firebase-client';

/**
 * Business stall applications, which the banner invites alongside guest
 * bookings. These are enquiries, not bookings: nothing is charged, nothing is
 * reserved, and the organiser follows up by hand from the dashboard.
 *
 * Firestore is the real store, as it is for bookings. The local file is only a
 * fallback for development and for the moments a serverless instance cannot
 * reach Firestore; on Vercel that file is in a temp directory and does not
 * survive, which is why a failed Firestore write is reported rather than
 * silently accepted.
 */

export interface StallEnquiry {
  id: string;
  businessName: string;
  contactName: string;
  phone: string;
  email: string;
  offering: string;
  notes: string;
  createdAt: string;
  status: 'new';
}

export type StallEnquiryInput = Omit<StallEnquiry, 'id' | 'createdAt' | 'status'>;

function text(value: any, label: string, max: number, required: boolean): string {
  if (value === undefined || value === null || value === '') {
    if (required) throw new Error(`Enter ${label}.`);
    return '';
  }
  if (typeof value !== 'string' || value.length > max || /[\u0000-\u001f<>]/.test(value)) {
    throw new Error(`Check ${label}.`);
  }
  const trimmed = value.trim();
  if (required && !trimmed) throw new Error(`Enter ${label}.`);
  return trimmed;
}

export function validateStallEnquiry(input: any): StallEnquiryInput {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Enter your stall details.');
  }

  const businessName = text(input.businessName, 'your business name', 120, true);
  const contactName = text(input.contactName, 'a contact name', 100, true);
  const phone = text(input.phone, 'a contact phone number', 20, true);
  const email = text(input.email, 'a contact email', 150, false).toLowerCase();
  const offering = text(input.offering, 'what your stall would offer', 200, true);
  const notes = text(input.notes, 'anything else', 1000, false);

  if (
    !/^\+?[0-9 ()-]{8,20}$/.test(phone) ||
    phone.replace(/\D/g, '').length < 8 ||
    phone.replace(/\D/g, '').length > 15
  ) {
    throw new Error('Check the contact phone number.');
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Check the contact email address.');
  }

  return { businessName, contactName, phone, email, offering, notes };
}

function localFile(): string {
  try {
    const baseDir =
      process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
        ? path.join(os.tmpdir(), 'axp_data')
        : path.join(process.cwd(), '.data');
    if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
    return path.join(baseDir, 'axp_stall_enquiries.json');
  } catch {
    return '';
  }
}

let memory: StallEnquiry[] = [];

function readLocal(): StallEnquiry[] {
  try {
    const file = localFile();
    if (file && fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf-8'));
      if (Array.isArray(parsed)) memory = parsed;
    }
  } catch {
    // keep whatever is in memory
  }
  return memory;
}

function writeLocal(rows: StallEnquiry[]) {
  memory = rows;
  try {
    const file = localFile();
    if (file) fs.writeFileSync(file, JSON.stringify(rows, null, 2), 'utf-8');
  } catch {
    // memory only, on a read-only filesystem
  }
}

export async function saveStallEnquiry(input: StallEnquiryInput): Promise<StallEnquiry> {
  const enquiry: StallEnquiry = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: 'new',
  };

  writeLocal([...readLocal(), enquiry]);

  // The local copy above is a cache; Firestore is what the organiser reads, so
  // a failure here has to surface rather than look like a successful send.
  await saveStallEnquiryFirestore(enquiry);

  return enquiry;
}

export async function listStallEnquiries(): Promise<StallEnquiry[]> {
  const fromCloud = await getAllStallEnquiriesFirestore();
  const rows = Object.keys(fromCloud).length > 0 ? Object.values(fromCloud) : readLocal();
  return [...rows].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
