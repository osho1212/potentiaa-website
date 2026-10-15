import { uploadConfirmationImageStorage } from './firebase-client';

export interface FirebaseConfig {
  projectId: string;
  storageBucket: string;
  apiKey: string;
}

export function getFirebaseConfig(): FirebaseConfig {
  return {
    projectId: process.env.FIREBASE_PROJECT_ID || 'potentia-projects',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'potentia-projects.firebasestorage.app',
    apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyByNw2L4gVeGXiETsbPa8hrVN8VOgTzc5A',
  };
}

export function isFirebaseConfigured(): boolean {
  return true;
}

export async function uploadConfirmationImageToFirebase(params: {
  bookingId: string;
  imageBuffer: Buffer | Uint8Array;
  contentType?: string;
}): Promise<string | null> {
  return uploadConfirmationImageStorage(params.bookingId, params.imageBuffer);
}
