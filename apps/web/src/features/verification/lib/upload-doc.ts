import { ref, uploadBytesResumable } from 'firebase/storage';
import { VERIFICATION_FILE_MAX_BYTES, type VerificationFile } from '@tinhome/shared/constants';
import { firebase } from '@/lib/firebase';

const ACCEPTED = /^(image\/(jpeg|png|webp|heic|heif)|application\/pdf)$/;

export type DocProblem = 'tooBig' | 'badType';

/** AC-08.3 — JPG/PNG/WEBP/HEIC/PDF up to 10 MB (the Storage rules check it again). */
export function docProblem(file: File): DocProblem | null {
  if (!ACCEPTED.test(file.type)) return 'badType';
  if (file.size > VERIFICATION_FILE_MAX_BYTES) return 'tooBig';
  return null;
}

/** Id of a new verification: the folder of its files in Storage. */
export function newVerificationId(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

/** Uploads one document to `private/verifications/{uid}/{id}/{key}` (write-only for the owner). */
export function uploadDoc(
  uid: string,
  verificationId: string,
  key: VerificationFile,
  file: File,
  onProgress: (percent: number) => void,
): Promise<string> {
  const path = `private/verifications/${uid}/${verificationId}/${key}`;
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(ref(firebase().storage, path), file, {
      contentType: file.type,
    });
    task.on(
      'state_changed',
      (snap) =>
        onProgress(Math.round((snap.bytesTransferred / Math.max(1, snap.totalBytes)) * 100)),
      reject,
      () => resolve(path),
    );
  });
}
