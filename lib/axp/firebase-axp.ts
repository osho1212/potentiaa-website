import { uploadConfirmationImageStorage } from './firebase-client';

export async function uploadConfirmationImageToFirebase(params: {
  bookingId: string;
  imageBuffer: Buffer | Uint8Array;
  contentType?: string;
}): Promise<string | null> {
  return uploadConfirmationImageStorage(params.bookingId, params.imageBuffer);
}
