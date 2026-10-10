import {
  FieldValue,
  Timestamp,
  type DocumentData,
  type Firestore,
  type Transaction,
} from 'firebase-admin/firestore';
import { extendPremium, isFounderSlotAvailable, referralOutcome } from '@tinhome/shared/domain';
import type { Params } from '@tinhome/shared/types';
import { enqueueMail } from '../../core/email/queue.js';
import { publicUrl } from '../../core/public-url.js';

const YEAR_MS = 365 * 86_400_000;

function untilOf(user: DocumentData): Date | null {
  return user.premiumUntil instanceof Timestamp ? user.premiumUntil.toDate() : null;
}

/**
 * Reads everything the approval rewards need inside the decision transaction (reads before
 * writes) and returns the writes to apply:
 * - BR-19 founder: atomic per-city counter below P-08 → P-09 months of Premium (FOUNDER).
 * - BR-20 referral: P-10 days for both people unless phone/document match or P-11 is reached.
 */
export async function applyApprovalRewards(
  db: Firestore,
  tx: Transaction,
  ctx: { uid: string; user: DocumentData; docHash: string; params: Params; now: Date },
): Promise<{ apply: () => void }> {
  const { uid, user, params, now } = ctx;
  const cityId = typeof user.cityId === 'string' ? user.cityId : null;
  const referralRef = db.doc(`referrals/${uid}`);
  const [citySnap, referralSnap] = await Promise.all([
    cityId ? tx.get(db.doc(`cities/${cityId}`)) : Promise.resolve(null),
    tx.get(referralRef),
  ]);
  const inviterUid =
    referralSnap.exists && referralSnap.get('status') === 'REGISTERED'
      ? String(referralSnap.get('inviterUid'))
      : null;
  const [inviterSnap, inviterRewards] = inviterUid
    ? await Promise.all([
        tx.get(db.doc(`users/${inviterUid}`)),
        tx.get(
          db
            .collection('referrals')
            .where('inviterUid', '==', inviterUid)
            .where('status', '==', 'REWARDED')
            .where('rewardedAt', '>=', Timestamp.fromMillis(now.getTime() - YEAR_MS)),
        ),
      ])
    : [null, null];

  const writes: (() => void)[] = [];
  const url = `${publicUrl()}/app/perfil`;
  let inviteeUntil = untilOf(user);
  const inviteeUpdate: Record<string, unknown> = {};

  const founderCount = Number(citySnap?.get('counters.foundersAwarded') ?? 0);
  if (
    citySnap?.exists &&
    user.foundingMember !== true &&
    isFounderSlotAvailable(founderCount, params.foundersPerCity)
  ) {
    const grant = extendPremium(inviteeUntil, now, { months: params.founderPremiumMonths });
    inviteeUntil = grant.endsAt;
    Object.assign(inviteeUpdate, { foundingMember: true, premiumSource: 'FOUNDER' });
    writes.push(() => {
      tx.update(citySnap.ref, { 'counters.foundersAwarded': FieldValue.increment(1) });
      tx.update(db.doc(`publicProfiles/${uid}`), { foundingMember: true });
      tx.create(db.collection('entitlements').doc(), {
        uid,
        source: 'FOUNDER',
        startsAt: Timestamp.fromDate(grant.startsAt),
        endsAt: Timestamp.fromDate(grant.endsAt),
        refId: cityId,
      });
      if (typeof user.email === 'string') {
        enqueueMail(
          db,
          tx,
          {
            to: user.email,
            templateId: 'N-04',
            data: {
              months: params.founderPremiumMonths,
              cityName: String(citySnap.get('name') ?? ''),
              url,
            },
          },
          now,
        );
      }
    });
  }

  if (inviterUid && inviterSnap?.exists) {
    const inviter = inviterSnap.data() ?? {};
    const docHash = (inviter.verification as { docHash?: string } | undefined)?.docHash ?? null;
    const outcome = referralOutcome({
      inviterUid,
      inviteeUid: uid,
      inviterPhone: typeof inviter.phoneE164 === 'string' ? inviter.phoneE164 : null,
      inviteePhone: typeof user.phoneE164 === 'string' ? user.phoneE164 : null,
      inviterDocHash: docHash,
      inviteeDocHash: ctx.docHash,
      inviterRewardsLast12Months: inviterRewards.size,
      maxRewardsPerYear: params.referralMaxRewardsPerYear,
    });
    if (outcome.reward) {
      const inviteeGrant = extendPremium(inviteeUntil, now, { days: params.referralRewardDays });
      const inviterGrant = extendPremium(untilOf(inviter), now, {
        days: params.referralRewardDays,
      });
      inviteeUntil = inviteeGrant.endsAt;
      inviteeUpdate.premiumSource ??= 'REFERRAL';
      writes.push(() => {
        tx.update(referralRef, { status: 'REWARDED', rewardedAt: FieldValue.serverTimestamp() });
        for (const [who, grant] of [
          [uid, inviteeGrant],
          [inviterUid, inviterGrant],
        ] as const) {
          tx.create(db.collection('entitlements').doc(), {
            uid: who,
            source: 'REFERRAL',
            startsAt: Timestamp.fromDate(grant.startsAt),
            endsAt: Timestamp.fromDate(grant.endsAt),
            refId: uid,
          });
        }
        tx.update(inviterSnap.ref, {
          premiumUntil: Timestamp.fromDate(inviterGrant.endsAt),
          premiumSource: 'REFERRAL',
          updatedAt: FieldValue.serverTimestamp(),
        });
        for (const [email, role] of [
          [user.email, 'INVITEE'],
          [inviter.email, 'INVITER'],
        ] as const) {
          if (typeof email === 'string') {
            enqueueMail(
              db,
              tx,
              {
                to: email,
                templateId: 'N-13',
                data: { days: params.referralRewardDays, role, url: `${publicUrl()}/app/invita` },
              },
              now,
            );
          }
        }
      });
    } else {
      writes.push(() => {
        tx.update(referralRef, { status: 'INELIGIBLE', ineligibleReason: outcome.reason });
      });
    }
  }

  return {
    apply: () => {
      for (const write of writes) write();
      if (inviteeUntil && inviteeUntil !== untilOf(user))
        inviteeUpdate.premiumUntil = Timestamp.fromDate(inviteeUntil);
      if (Object.keys(inviteeUpdate).length > 0) tx.update(db.doc(`users/${uid}`), inviteeUpdate);
    },
  };
}
