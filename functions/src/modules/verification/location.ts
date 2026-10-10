import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import {
  LOCATION_ATTEMPTS_PER_DAY,
  type AdminRole,
  type LocationCheckStatus,
  type LocationResult,
  type ReviewDecision,
} from '@tinhome/shared/constants';
import { evaluateLocation, roundCoordinate, toIsoDate } from '@tinhome/shared/domain';
import type { LocationReviewSummary } from '@tinhome/shared/schemas';
import type { Params } from '@tinhome/shared/types';
import { appError } from '../../core/app-error.js';
import { writeAudit } from '../../core/audit.js';
import { sha256Hex } from '../../core/crypto.js';
import { loadUser, requireUserActive } from '../../core/users.js';
import { recomputeHome } from '../home/visibility.js';
import { iso, shortName } from './view.js';

const DAY_MS = 86_400_000;
const VERIFIED: readonly LocationCheckStatus[] = ['PASS', 'MANUAL_APPROVED'];

/**
 * FR-63 / BR-39 — one browser reading checked against the declared city. Max. 5 per day;
 * only the result, the rounded distance and accuracy are kept (coordinates for P-13 days).
 */
export async function verifyLocation(
  db: Firestore,
  uid: string,
  input: { lat: number; lng: number; accuracyM: number; isMobile: boolean },
  params: Params,
  now: Date,
): Promise<{ result: LocationResult; distanceKm: number; attemptsLeft: number }> {
  requireUserActive(await loadUser(db, uid));
  const homeRef = db.doc(`homes/${uid}`);
  const counterRef = db.doc(`rateLimits/location_${sha256Hex(uid).slice(0, 32)}_${toIsoDate(now)}`);

  const outcome = await db.runTransaction(async (tx) => {
    const [home, counter] = await Promise.all([tx.get(homeRef), tx.get(counterRef)]);
    const cityId = home.get('cityId') as string | undefined;
    if (!home.exists || !cityId) throw appError('E_HOME_INCOMPLETE');
    const used = counter.exists ? Number(counter.get('count')) : 0;
    if (used >= LOCATION_ATTEMPTS_PER_DAY) throw appError('E_LOCATION_ATTEMPTS');
    const city = await tx.get(db.doc(`cities/${cityId}`));
    const center = city.get('center') as { lat: number; lng: number } | undefined;
    if (!center) throw appError('E_CITY_UNKNOWN');
    const radiusKm = Number(city.get('radiusKm') ?? params.locationDefaultRadiusKm);
    const evaluation = evaluateLocation(input, { center, radiusKm });

    tx.set(counterRef, {
      scope: 'location',
      count: used + 1,
      expiresAt: Timestamp.fromMillis(now.getTime() + 2 * DAY_MS),
    });
    tx.create(db.collection('locationChecks').doc(), {
      uid,
      homeId: uid,
      cityId,
      latRounded: roundCoordinate(input.lat),
      lngRounded: roundCoordinate(input.lng),
      accuracyM: Math.round(input.accuracyM),
      distanceKm: evaluation.distanceKm,
      result: evaluation.result,
      userAgentMobile: input.isMobile,
      createdAt: FieldValue.serverTimestamp(),
      purgeAt: Timestamp.fromMillis(now.getTime() + params.verificationDocsRetentionDays * DAY_MS),
    });
    const current =
      (home.get('locationCheck') as { status?: LocationCheckStatus } | undefined)?.status ?? 'NONE';
    // Once verified, a later failed reading never undoes it (the check is done once, ADR-019).
    if (!VERIFIED.includes(current) && evaluation.result !== 'INACCURATE') {
      tx.update(homeRef, {
        locationCheck: {
          status: evaluation.result === 'PASS' ? 'PASS' : 'FAIL',
          distanceKm: evaluation.distanceKm,
          checkedAt: FieldValue.serverTimestamp(),
        },
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    return { ...evaluation, attemptsLeft: LOCATION_ATTEMPTS_PER_DAY - used - 1 };
  });
  if (outcome.result === 'PASS') await recomputeHome(db, uid, params);
  return outcome;
}

/** FR-63 — after a failed check the owner asks a person to review it (with an explanation). */
export async function requestLocationReview(
  db: Firestore,
  uid: string,
  note: string,
): Promise<void> {
  const homeRef = db.doc(`homes/${uid}`);
  await db.runTransaction(async (tx) => {
    const home = await tx.get(homeRef);
    const status = (home.get('locationCheck') as { status?: LocationCheckStatus } | undefined)
      ?.status;
    if (!home.exists || (status !== 'FAIL' && status !== 'MANUAL_REJECTED'))
      throw appError('E_STATE');
    tx.update(homeRef, {
      locationCheck: { status: 'MANUAL_PENDING', note, requestedAt: FieldValue.serverTimestamp() },
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.create(db.collection('adminAlerts').doc(), {
      type: 'LOCATION_MANUAL',
      refType: 'home',
      refId: uid,
      priority: 'NORMAL',
      createdAt: FieldValue.serverTimestamp(),
      handledAt: null,
    });
  });
}

export async function listLocationReviews(db: Firestore): Promise<LocationReviewSummary[]> {
  const homes = await db
    .collection('homes')
    .where('locationCheck.status', '==', 'MANUAL_PENDING')
    .limit(50)
    .get();
  return Promise.all(
    homes.docs.map(async (home) => {
      const [user, last] = await Promise.all([
        db.doc(`users/${home.id}`).get(),
        db
          .collection('locationChecks')
          .where('uid', '==', home.id)
          .orderBy('createdAt', 'desc')
          .limit(1)
          .get(),
      ]);
      const check = last.docs[0];
      const locationCheck = home.get('locationCheck') as { note?: string; requestedAt?: unknown };
      return {
        homeId: home.id,
        displayName: shortName(user.data()),
        cityId: String(home.get('cityId')),
        note: locationCheck.note ?? '',
        requestedAt: iso(locationCheck.requestedAt) ?? new Date(0).toISOString(),
        lastCheck: check
          ? {
              result: check.get('result') as LocationResult,
              distanceKm: Number(check.get('distanceKm')),
              accuracyM: Number(check.get('accuracyM')),
            }
          : null,
      };
    }),
  );
}

export async function decideLocationReview(
  db: Firestore,
  actor: { uid: string; role: AdminRole },
  input: { homeId: string; decision: ReviewDecision; reason: string },
  params: Params,
): Promise<LocationCheckStatus> {
  const status: LocationCheckStatus =
    input.decision === 'APPROVE' ? 'MANUAL_APPROVED' : 'MANUAL_REJECTED';
  const homeRef = db.doc(`homes/${input.homeId}`);
  await db.runTransaction(async (tx) => {
    const home = await tx.get(homeRef);
    const current = (home.get('locationCheck') as { status?: string } | undefined)?.status;
    if (!home.exists || current !== 'MANUAL_PENDING') throw appError('E_STATE');
    tx.update(homeRef, {
      locationCheck: {
        status,
        reason: input.reason,
        decidedBy: actor.uid,
        decidedAt: FieldValue.serverTimestamp(),
      },
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  await writeAudit({
    actorUid: actor.uid,
    actorRole: actor.role,
    action: `location.${input.decision.toLowerCase()}`,
    targetType: 'home',
    targetId: input.homeId,
    after: { locationCheck: status },
    reason: input.reason,
  });
  await recomputeHome(db, input.homeId, params);
  return status;
}
