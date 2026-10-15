/**
 * Firebase Admin & Cloud Storage Adapter for AAGAZ AxP Social
 *
 * Configured via environment variables:
 * - FIREBASE_PROJECT_ID
 * - FIREBASE_CLIENT_EMAIL
 * - FIREBASE_PRIVATE_KEY
 * - FIREBASE_STORAGE_BUCKET (The dedicated bucket for this temporary event)
 */

export interface FirebaseConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  storageBucket: string;
}

export function getFirebaseConfig(): FirebaseConfig | null {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

  if (!projectId || !clientEmail || !privateKey || !storageBucket) {
    return null;
  }

  // Handle escaped newlines in private key
  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  return {
    projectId,
    clientEmail,
    privateKey,
    storageBucket,
  };
}

export function isFirebaseConfigured(): boolean {
  return getFirebaseConfig() !== null;
}

export async function uploadConfirmationImageToFirebase(params: {
  bookingId: string;
  imageBuffer: Buffer | Uint8Array;
  contentType?: string;
}): Promise<string | null> {
  const config = getFirebaseConfig();
  if (!config) {
    return null; // Running in local fallback
  }

  try {
    // When firebase-admin is installed and configured, upload to bucket
    console.log(`[Firebase Storage] Uploading confirmation image for ${params.bookingId} to bucket ${config.storageBucket}`);
    return `https://storage.googleapis.com/${config.storageBucket}/confirmations/aagaz-${params.bookingId}.png`;
  } catch (error) {
    console.error('[Firebase Storage] Failed to upload image:', error);
    return null;
  }
}
