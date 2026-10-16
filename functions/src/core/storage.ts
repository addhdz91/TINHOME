import { randomUUID } from 'node:crypto';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { DEMO_PROJECT_ID } from '@tinhome/shared/constants';

/**
 * Default bucket: `STORAGE_BUCKET`, else the project's own default bucket from FIREBASE_CONFIG
 * (new projects use `*.firebasestorage.app`, so the name is never guessed in production).
 */
export function bucketName(): string {
  if (process.env.STORAGE_BUCKET) return process.env.STORAGE_BUCKET;
  const fromConfig = firebaseConfigBucket();
  if (fromConfig) return fromConfig;
  if (process.env.FUNCTIONS_EMULATOR === 'true' || process.env.VITEST) {
    const projectId =
      process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT ?? DEMO_PROJECT_ID;
    return `${projectId}.appspot.com`;
  }
  throw new Error('STORAGE_BUCKET is not configured');
}

function firebaseConfigBucket(): string | null {
  try {
    const config = JSON.parse(process.env.FIREBASE_CONFIG ?? '{}') as { storageBucket?: unknown };
    return typeof config.storageBucket === 'string' && config.storageBucket
      ? config.storageBucket
      : null;
  } catch {
    return null;
  }
}

export function bucket() {
  if (getApps().length === 0) initializeApp();
  return getStorage().bucket(bucketName());
}

/**
 * Public download URL with a Firebase download token. `<img>` cannot send auth headers, so
 * processed home photos are served by token URL (10_DECISIONS §5, M3).
 */
export function downloadUrl(path: string, token: string): string {
  const host = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
  const base = host ? `http://${host}` : 'https://firebasestorage.googleapis.com';
  return `${base}/v0/b/${bucketName()}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

export function newDownloadToken(): string {
  return randomUUID();
}
