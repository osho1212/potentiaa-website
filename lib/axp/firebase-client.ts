import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage, getDownloadURL } from 'firebase-admin/storage';
import type { BookingRecord } from './storage-adapter';
import type { EventSettings } from './event-settings';

/**
 * Only this server reads or writes the guest database. It signs in with a
 * service account through the Admin SDK, which the security rules do not
 * apply to, and the rules (firestore.rules, storage.rules) refuse everyone
 * else. Guests' phone numbers, emails and dates of birth used to be readable
 * by anyone holding the project's public web config; they no longer are.
 *
 * The key comes from FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY, copied
 * from a service account key file of the potentia-projects project.
 */
const EXPECTED_PROJECT = process.env.FIREBASE_PROJECT_ID || 'potentia-projects';

function getFirebaseApp(): App {
  const name = 'axp-social-admin';
  const existing = getApps().find(app => app.name === name);
  if (existing) {
    return existing;
  }

  const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL || '').trim();
  // Vercel keeps a pasted key's line breaks, but a key copied out of the JSON
  // file arrives with them written as "\n"; both work.
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n').trim();
  if (!clientEmail || !privateKey) {
    throw new Error('FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY are not set, so the guest database cannot be reached.');
  }
  // A key from the wrong project would open an empty database: no settings,
  // no bookings to count against capacity or check contacts against.
  if (!clientEmail.endsWith(`@${EXPECTED_PROJECT}.iam.gserviceaccount.com`)) {
    throw new Error(`The Firebase service account ${clientEmail} is not from the ${EXPECTED_PROJECT} project.`);
  }

  return initializeApp(
    {
      credential: cert({ projectId: EXPECTED_PROJECT, clientEmail, privateKey }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${EXPECTED_PROJECT}.firebasestorage.app`,
    },
    name
  );
}

export function getFirebaseDb(): Firestore {
  return getFirestore(getFirebaseApp());
}

/**
 * Save or update a booking in Firestore under `axp_bookings`
 */
export async function saveBookingFirestore(booking: BookingRecord): Promise<void> {
  try {
    const db = getFirebaseDb();
    await db.collection('axp_bookings').doc(booking.id).set(JSON.parse(JSON.stringify(booking)), { merge: true });
  } catch (error) {
    console.error(`[Firebase] Failed to save booking ${booking.id}:`, error);
    throw error;
  }
}

/**
 * Permanently delete a booking from Firestore under `axp_bookings`
 */
export async function deleteBookingFirestore(id: string): Promise<void> {
  try {
    const db = getFirebaseDb();
    await db.collection('axp_bookings').doc(id).delete();
  } catch (error) {
    console.error(`[Firebase] Failed to delete booking ${id}:`, error);
    throw error;
  }
}

/**
 * Merge only the given top-level fields into a booking, leaving every other
 * field (attendees, check-ins) exactly as Firestore has it.
 */
export async function saveBookingFieldsFirestore(id: string, fields: Record<string, unknown>): Promise<void> {
  const db = getFirebaseDb();
  await db.collection('axp_bookings').doc(id).set(JSON.parse(JSON.stringify(fields)), { merge: true });
}

/**
 * Fetch a single booking by ID from Firestore. Null means Firestore has no such
 * booking; a failed read throws, so callers can tell the two apart.
 */
export async function getBookingFirestore(id: string): Promise<BookingRecord | null> {
  try {
    const db = getFirebaseDb();
    const snap = await db.collection('axp_bookings').doc(id).get();
    if (!snap.exists) {
      return null;
    }
    return snap.data() as BookingRecord;
  } catch (error) {
    console.error(`[Firebase] Failed to fetch booking ${id}:`, error);
    throw error;
  }
}

/**
 * Fetch all bookings from Firestore for the Admin and Check-in rosters. A
 * failed read throws rather than looking like an empty guest list.
 */
export async function getAllBookingsFirestore(): Promise<Record<string, BookingRecord>> {
  try {
    const db = getFirebaseDb();
    const snap = await db.collection('axp_bookings').get();
    const result: Record<string, BookingRecord> = {};
    snap.forEach(d => {
      result[d.id] = d.data() as BookingRecord;
    });
    return result;
  } catch (error) {
    console.error('[Firebase] Failed to fetch all bookings:', error);
    throw error;
  }
}

/**
 * Business stall applications, under `axp_stall_enquiries`
 */
export async function saveStallEnquiryFirestore(enquiry: any): Promise<void> {
  const db = getFirebaseDb();
  await db.collection('axp_stall_enquiries').doc(enquiry.id).set(JSON.parse(JSON.stringify(enquiry)), { merge: true });
}

export async function getAllStallEnquiriesFirestore(): Promise<Record<string, any>> {
  try {
    const db = getFirebaseDb();
    const snap = await db.collection('axp_stall_enquiries').get();
    const result: Record<string, any> = {};
    snap.forEach((d) => {
      result[d.id] = d.data();
    });
    return result;
  } catch (error) {
    console.error('[Firebase] Failed to fetch stall enquiries:', error);
    return {};
  }
}

/**
 * Mark an attendee as checked in. The read and the write are one transaction,
 * so two gate phones scanning the same booking cannot overwrite each other.
 */
export async function updateCheckInFirestore(
  bookingId: string,
  attendeeId: string,
  checkedInAt = new Date().toISOString()
): Promise<boolean> {
  try {
    const db = getFirebaseDb();
    const docRef = db.collection('axp_bookings').doc(bookingId);
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      if (!snap.exists) {
        return false;
      }
      const booking = snap.data() as BookingRecord;
      const attendees = (booking.attendees || []).map(a => {
        if (a.id === attendeeId) {
          return { ...a, checkedIn: true, checkedInAt };
        }
        return a;
      });
      const checkedInAttendees = Array.from(
        new Set([...(booking.checkedInAttendees || []), attendeeId])
      );
      tx.update(docRef, JSON.parse(JSON.stringify({
        attendees,
        checkedInAttendees,
        updatedAt: checkedInAt,
      })));
      return true;
    });
  } catch (error) {
    console.error(`[Firebase] Failed to update check-in for attendee ${attendeeId}:`, error);
    return false;
  }
}

/**
 * Reset an attendee's check-in status (undo check-in).
 */
export async function resetCheckInFirestore(
  bookingId: string,
  attendeeId: string
): Promise<boolean> {
  try {
    const db = getFirebaseDb();
    const docRef = db.collection('axp_bookings').doc(bookingId);
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      if (!snap.exists) {
        return false;
      }
      const booking = snap.data() as BookingRecord;
      const attendees = (booking.attendees || []).map(a => {
        if (a.id === attendeeId) {
          const updated = { ...a, checkedIn: false };
          delete updated.checkedInAt;
          return updated;
        }
        return a;
      });
      const checkedInAttendees = (booking.checkedInAttendees || []).filter(id => id !== attendeeId);
      tx.update(docRef, JSON.parse(JSON.stringify({
        attendees,
        checkedInAttendees,
        updatedAt: new Date().toISOString(),
      })));
      return true;
    });
  } catch (error) {
    console.error(`[Firebase] Failed to reset check-in for attendee ${attendeeId}:`, error);
    return false;
  }
}

/**
 * Save Event Settings to Firestore under `axp_settings/aagaz`. A failed save
 * throws, so the organiser is told rather than shown settings that only one
 * server remembers.
 */
export async function saveSettingsFirestore(settings: EventSettings): Promise<void> {
  try {
    const db = getFirebaseDb();
    await db.collection('axp_settings').doc('aagaz').set(JSON.parse(JSON.stringify(settings)), { merge: true });
  } catch (error) {
    console.error('[Firebase] Failed to save settings to Firestore:', error);
    throw error;
  }
}

/**
 * Fetch Event Settings from Firestore under `axp_settings/aagaz`
 */
export async function getSettingsFirestore(): Promise<EventSettings | null> {
  try {
    const db = getFirebaseDb();
    const snap = await db.collection('axp_settings').doc('aagaz').get();
    if (!snap.exists) {
      return null;
    }
    return snap.data() as EventSettings;
  } catch (error) {
    console.error('[Firebase] Failed to fetch settings from Firestore:', error);
    return null;
  }
}

/**
 * Upload confirmation QR image or ticket badge to Cloud Storage bucket
 */
export async function uploadConfirmationImageStorage(
  bookingId: string,
  imageBuffer: Buffer | Uint8Array,
  filename = `aagaz-${bookingId}.png`
): Promise<string | null> {
  try {
    const file = getStorage(getFirebaseApp()).bucket().file(`axp-social/confirmations/${filename}`);
    await file.save(Buffer.from(imageBuffer), {
      contentType: 'image/png',
      metadata: { cacheControl: 'public, max-age=31536000' },
    });
    // A tokenised download link works without any read access in the rules.
    return await getDownloadURL(file);
  } catch (error) {
    console.error('[Firebase] Cloud Storage upload error:', error);
    return null;
  }
}
