import { randomUUID } from 'node:crypto';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { DEMO_PROJECT_ID } from '@tinhome/shared/constants';

/** Default bucket (`STORAGE_BUCKET` or `<project>.appspot.com`, as the web client). */
export function bucketName(): string {
  const projectId =
    process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT ?? DEMO_PROJECT_ID;
  return process.env.STORAGE_BUCKET ?? `${projectId}.appspot.com`;
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
