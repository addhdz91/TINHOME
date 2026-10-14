import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import type { PremiumSource } from '@tinhome/shared/constants';
import { premiumFromEntitlements } from '@tinhome/shared/domain';

function date(value: unknown): Date | null {
  return value instanceof Timestamp ? value.toDate() : null;
}

/**
 * BR-17 — recomputes `users.premiumUntil` / `premiumSource` from `entitlements` and mirrors it
 * on the home (`ownerPremium`, BR-14 ranking boost).
 */
export async function recomputePremium(
  db: Firestore,
  uid: string,
  now: Date,
): Promise<Date | null> {
  const snaps = await db.collection('entitlements').where('uid', '==', uid).get();
  const premium = premiumFromEntitlements(
    snaps.docs.flatMap((doc) => {
      const startsAt = date(doc.get('startsAt'));
      const endsAt = date(doc.get('endsAt'));
      if (!startsAt || !endsAt) return [];
      return [
        {
          source: doc.get('source') as PremiumSource,
          startsAt,
          endsAt,
          revokedAt: date(doc.get('revokedAt')),
        },
      ];
    }),
    now,
  );
  const batch = db.batch();
  batch.update(db.doc(`users/${uid}`), {
    premiumUntil: premium ? Timestamp.fromDate(premium.until) : null,
    premiumSource: premium?.source ?? null,
    updatedAt: FieldValue.serverTimestamp(),
  });
  const home = await db.doc(`homes/${uid}`).get();
  if (home.exists) batch.update(home.ref, { ownerPremium: premium !== null });
  await batch.commit();
  return premium?.until ?? null;
}
