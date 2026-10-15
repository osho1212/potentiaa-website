import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  query,
  updateDoc,
} from 'firebase/firestore';
import {
  getStorage,
  FirebaseStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import type { BookingRecord } from './storage-adapter';
import type { EventSettings } from './event-settings';

const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID || 'potentia-projects',
  apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyByNw2L4gVeGXiETsbPa8hrVN8VOgTzc5A',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'potentia-projects.firebasestorage.app',
  appId: process.env.FIREBASE_APP_ID || '1:10477941048:web:a3c5c6f4acb3863f4991cd',
};

function getFirebaseApp(): FirebaseApp {
  const name = 'axp-social-firebase';
  const existing = getApps().find(app => app.name === name);
  if (existing) {
    return existing;
  }
  return initializeApp(firebaseConfig, name);
}

export function getFirebaseDb(): Firestore {
  return getFirestore(getFirebaseApp());
}

export function getFirebaseStorageInstance(): FirebaseStorage {
  return getStorage(getFirebaseApp());
}

/**
 * Save or update a booking in Firestore under `axp_bookings`
 */
export async function saveBookingFirestore(booking: BookingRecord): Promise<void> {
  try {
    const db = getFirebaseDb();
    const docRef = doc(db, 'axp_bookings', booking.id);
    await setDoc(docRef, JSON.parse(JSON.stringify(booking)), { merge: true });
  } catch (error) {
    console.error(`[Firebase] Failed to save booking ${booking.id}:`, error);
    throw error;
  }
}

/**
 * Fetch a single booking by ID from Firestore
 */
export async function getBookingFirestore(id: string): Promise<BookingRecord | null> {
  try {
    const db = getFirebaseDb();
    const docRef = doc(db, 'axp_bookings', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return null;
    }
    return snap.data() as BookingRecord;
  } catch (error) {
    console.error(`[Firebase] Failed to fetch booking ${id}:`, error);
    return null;
  }
}

/**
 * Fetch all bookings from Firestore for the Admin and Check-in rosters
 */
export async function getAllBookingsFirestore(): Promise<Record<string, BookingRecord>> {
  try {
    const db = getFirebaseDb();
    const colRef = collection(db, 'axp_bookings');
    const snap = await getDocs(query(colRef));
    const result: Record<string, BookingRecord> = {};
    snap.forEach(d => {
      result[d.id] = d.data() as BookingRecord;
    });
    return result;
  } catch (error) {
    console.error('[Firebase] Failed to fetch all bookings:', error);
    return {};
  }
}

/**
 * Mark an attendee as checked in atomically in Firestore
 */
export async function updateCheckInFirestore(
  bookingId: string,
  attendeeId: string,
  checkedInAt = new Date().toISOString()
): Promise<boolean> {
  try {
    const db = getFirebaseDb();
    const docRef = doc(db, 'axp_bookings', bookingId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
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
    await updateDoc(docRef, {
      attendees,
      checkedInAttendees,
      updatedAt: checkedInAt,
    });
    return true;
  } catch (error) {
    console.error(`[Firebase] Failed to update check-in for attendee ${attendeeId}:`, error);
    return false;
  }
}

/**
 * Save Event Settings to Firestore under `axp_settings/aagaz`
 */
export async function saveSettingsFirestore(settings: EventSettings): Promise<void> {
  try {
    const db = getFirebaseDb();
    const docRef = doc(db, 'axp_settings', 'aagaz');
    await setDoc(docRef, JSON.parse(JSON.stringify(settings)), { merge: true });
  } catch (error) {
    console.error('[Firebase] Failed to save settings to Firestore:', error);
  }
}

/**
 * Fetch Event Settings from Firestore under `axp_settings/aagaz`
 */
export async function getSettingsFirestore(): Promise<EventSettings | null> {
  try {
    const db = getFirebaseDb();
    const docRef = doc(db, 'axp_settings', 'aagaz');
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
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
    const storage = getFirebaseStorageInstance();
    const fileRef = ref(storage, `axp-social/confirmations/${filename}`);
    await uploadBytes(fileRef, imageBuffer, {
      contentType: 'image/png',
      cacheControl: 'public, max-age=31536000',
    });
    return await getDownloadURL(fileRef);
  } catch (error) {
    console.error('[Firebase] Cloud Storage upload error:', error);
    return null;
  }
}
