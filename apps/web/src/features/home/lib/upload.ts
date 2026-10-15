import { ref, uploadBytesResumable } from 'firebase/storage';
import { firebase } from '@/lib/firebase';

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = /^image\/(jpeg|png|webp|heic|heif)$/;
const MAX_SIDE = 2048;

export type UploadProblem = 'tooBig' | 'badType';

/** BR-23 — type and size checked before uploading (the rules check them again). */
export function uploadProblem(file: File): UploadProblem | null {
  if (!ACCEPTED.test(file.type)) return 'badType';
  if (file.size > MAX_BYTES) return 'tooBig';
  return null;
}

/**
 * FR-11 — client-side compression: images the browser can decode are resized to ≤ 2048 px
 * and re-encoded as JPEG (faster uploads on mobile). HEIC usually cannot be decoded and is
 * sent as is; the server converts it. EXIF is removed on the server in any case.
 */
export async function compressImage(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85),
    );
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

/** Uploads to `homes/{uid}/raw/{photoId}`; the Storage trigger processes and deletes it. */
export function uploadRawPhoto(
  uid: string,
  photoId: string,
  blob: Blob,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(
      ref(firebase().storage, `homes/${uid}/raw/${photoId}`),
      blob,
      {
        contentType: blob.type || 'image/jpeg',
      },
    );
    task.on(
      'state_changed',
      (snap) =>
        onProgress(Math.round((snap.bytesTransferred / Math.max(1, snap.totalBytes)) * 100)),
      reject,
      () => resolve(),
    );
  });
}
