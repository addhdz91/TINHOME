import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { bucket } from '../../core/storage.js';

const BATCH = 200;

/**
 * J-04 (BR-25) — deletes verification documents whose `filesPurgeAt` has passed. Fraud
 * suspicions keep `filesPurgeAt = null` and are never selected. Returns how many were purged.
 */
export async function purgeVerificationFiles(db: Firestore, now: Date): Promise<number> {
  const due = await db
    .collection('verifications')
    .where('filesPurgeAt', '<=', Timestamp.fromDate(now))
    .limit(BATCH)
    .get();
  for (const snap of due.docs) {
    await bucket().deleteFiles({
      prefix: `private/verifications/${String(snap.get('uid'))}/${snap.id}/`,
    });
    await snap.ref.update({
      files: {},
      filesPurgeAt: null,
      filesPurgedAt: FieldValue.serverTimestamp(),
    });
  }
  return due.size;
}

/** J-10 (BR-39) — removes the rounded coordinates of location checks after P-13 days. */
export async function purgeLocationCoordinates(db: Firestore, now: Date): Promise<number> {
  const due = await db
    .collection('locationChecks')
    .where('purgeAt', '<=', Timestamp.fromDate(now))
    .limit(BATCH)
    .get();
  const batch = db.batch();
  for (const snap of due.docs) {
    batch.update(snap.ref, {
      latRounded: FieldValue.delete(),
      lngRounded: FieldValue.delete(),
      purgeAt: FieldValue.delete(),
      coordinatesPurgedAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
  return due.size;
}
