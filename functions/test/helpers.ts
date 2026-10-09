import type { CallableRequest } from 'firebase-functions/v2/https';
import { db } from '../src/core/firebase.js';

const projectId = process.env.GCLOUD_PROJECT ?? 'demo-tinhome';

/** Wipes the Firestore emulator between tests. */
export async function clearFirestore(): Promise<void> {
  const host = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';
  const res = await fetch(
    `http://${host}/emulator/v1/projects/${projectId}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  if (!res.ok) throw new Error(`clearFirestore failed: ${res.status}`);
}

/** Minimal public callable request (no auth), as Cloud Functions builds it. */
export function publicRequest<T>(data: T, ip = '203.0.113.7'): CallableRequest<T> {
  return {
    data,
    rawRequest: { ip, headers: {} },
    acceptsStreaming: false,
  } as unknown as CallableRequest<T>;
}

/** HttpsError details code of a rejected promise. */
export async function errorCode(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
    return undefined;
  } catch (error) {
    return (error as { details?: { code?: string } }).details?.code;
  }
}

/** Cities, windows and privacy text the waitlist needs. */
export async function seedWaitlistFixtures(): Promise<void> {
  const firestore = db();
  const city = (name: string, status: string, order: number) => ({
    name,
    province: name,
    region: name,
    timezone: 'Europe/Madrid',
    center: { lat: 40, lng: -3 },
    radiusKm: 25,
    status,
    openThreshold: 150,
    counters: { visibleCandidates: 0, waitlist: 0, foundersAwarded: 0 },
    order,
  });
  await Promise.all([
    firestore.doc('cities/madrid').set(city('Madrid', 'OPEN', 1)),
    firestore.doc('cities/valencia').set(city('Valencia', 'OPEN', 2)),
    firestore.doc('cities/malaga').set(city('Málaga', 'WAITLIST', 3)),
    firestore.doc('cities/closed').set(city('Cerrada', 'CLOSED', 9)),
    firestore.doc('windows/ss27').set({
      name: 'Semana Santa 2027',
      startDate: '2027-03-20',
      endDate: '2027-03-28',
      active: true,
      cityIds: null,
      order: 1,
    }),
    firestore.doc('windows/old').set({
      name: 'Antigua',
      startDate: '2026-01-01',
      endDate: '2026-01-02',
      active: false,
      cityIds: null,
      order: 9,
    }),
    firestore
      .doc('legalDocs/privacidad')
      .set({ title: 'Privacidad', currentVersion: '0.1-provisional' }),
  ]);
}
