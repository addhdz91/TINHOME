import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import {
  EMAIL_RESEND_SECONDS,
  WAITLIST_TOKEN_TTL_DAYS,
  type WaitlistStatus,
} from '@tinhome/shared/constants';
import { demandPairs, normalizeEmail } from '@tinhome/shared/domain';
import type {
  ConfirmWaitlistInput,
  ConfirmWaitlistOutput,
  JoinWaitlistInput,
} from '@tinhome/shared/schemas';
import type { CityDoc, Params } from '@tinhome/shared/types';
import { appError } from '../../core/app-error.js';
import { randomToken, sha256Hex } from '../../core/crypto.js';
import { enqueueMail } from '../../core/email/queue.js';
import { publicUrl } from '../../core/public-url.js';

const DAY_MS = 86_400_000;

/** Validates cities, windows and the accepted privacy version against Firestore. */
async function validateReferences(
  db: Firestore,
  input: JoinWaitlistInput,
  params: Params,
): Promise<CityDoc> {
  if (input.destinations.length > params.maxDestinations) {
    throw appError('E_VALIDATION', { fields: { destinations: 'too_big' } });
  }
  const cityRefs = [input.cityId, ...input.destinations].map((id) => db.doc(`cities/${id}`));
  const windowRefs = input.windowIds.map((id) => db.doc(`windows/${id}`));
  const [privacy, ...snapshots] = await db.getAll(
    db.doc('legalDocs/privacidad'),
    ...cityRefs,
    ...windowRefs,
  );
  const citySnaps = snapshots.slice(0, cityRefs.length);
  const windowSnaps = snapshots.slice(cityRefs.length);

  if (citySnaps.some((snap) => !snap.exists || snap.get('status') === 'CLOSED')) {
    throw appError('E_CITY_UNKNOWN');
  }
  if (windowSnaps.some((snap) => !snap.exists || snap.get('active') !== true)) {
    throw appError('E_VALIDATION', { fields: { windowIds: 'invalid' } });
  }
  if (!privacy?.exists || privacy.get('currentVersion') !== input.acceptPrivacy) {
    throw appError('E_LEGAL_VERSION');
  }
  return citySnaps[0]?.data() as CityDoc;
}

/**
 * FR-19 — joins the waitlist and sends the double opt-in e-mail (N-19). The answer never
 * reveals whether the e-mail already existed (no enumeration).
 */
export async function joinWaitlist(
  db: Firestore,
  input: JoinWaitlistInput,
  params: Params,
  now: Date,
): Promise<{ ok: true }> {
  const city = await validateReferences(db, input, params);
  const email = normalizeEmail(input.email);
  const ref = db.doc(`waitlist/${sha256Hex(email)}`);

  await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    const status = snapshot.get('status') as WaitlistStatus | undefined;
    // Already in: nothing to change and no e-mail (the visitor sees the same answer).
    if (status === 'CONFIRMED' || status === 'CONVERTED') return;

    const preferences = {
      email,
      cityId: input.cityId,
      destinations: input.destinations,
      windowIds: input.windowIds,
      privacyVersion: input.acceptPrivacy,
      privacyAcceptedAt: Timestamp.fromDate(now),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const lastEmailAt = snapshot.get('lastEmailAt') as Timestamp | undefined;
    const recentlyEmailed =
      status === 'PENDING_CONFIRMATION' &&
      lastEmailAt !== undefined &&
      now.getTime() - lastEmailAt.toMillis() < EMAIL_RESEND_SECONDS * 1000;
    if (recentlyEmailed) {
      tx.update(ref, preferences);
      return;
    }

    const token = randomToken();
    tx.set(ref, {
      ...preferences,
      status: 'PENDING_CONFIRMATION' satisfies WaitlistStatus,
      confirmToken: sha256Hex(token),
      confirmTokenExpiresAt: Timestamp.fromMillis(now.getTime() + WAITLIST_TOKEN_TTL_DAYS * DAY_MS),
      lastEmailAt: Timestamp.fromDate(now),
      createdAt: snapshot.exists
        ? (snapshot.get('createdAt') as unknown)
        : FieldValue.serverTimestamp(),
    });
    enqueueMail(
      db,
      tx,
      {
        to: email,
        templateId: 'N-19',
        data: {
          cityName: city.name,
          confirmUrl: `${publicUrl()}/lista-espera/confirmar?token=${token}`,
          expiresInDays: WAITLIST_TOKEN_TTL_DAYS,
        },
      },
      now,
    );
  });

  return { ok: true };
}

/**
 * FR-19 — confirms the double opt-in. Counts the visitor in their city (`counters.waitlist`)
 * and in the demand pairs (FR-18). Idempotent: a second click returns the same city.
 */
export async function confirmWaitlist(
  db: Firestore,
  input: ConfirmWaitlistInput,
  params: Params,
  now: Date,
): Promise<ConfirmWaitlistOutput> {
  const match = await db
    .collection('waitlist')
    .where('confirmToken', '==', sha256Hex(input.token))
    .limit(1)
    .get();
  const entryRef = match.docs[0]?.ref;
  if (!entryRef) throw appError('E_TOKEN_INVALID');

  return db.runTransaction(async (tx) => {
    const entry = await tx.get(entryRef);
    const status = entry.get('status') as WaitlistStatus;
    const cityId = entry.get('cityId') as string;
    if (status === 'CONFIRMED' || status === 'CONVERTED') return { cityId };

    const expiresAt = entry.get('confirmTokenExpiresAt') as Timestamp | undefined;
    if (status !== 'PENDING_CONFIRMATION' || !expiresAt || expiresAt.toMillis() < now.getTime()) {
      throw appError('E_TOKEN_INVALID');
    }

    const cityRef = db.doc(`cities/${cityId}`);
    const pairs = demandPairs(
      cityId,
      entry.get('destinations') as string[],
      entry.get('windowIds') as string[],
    );
    const counterRefs = pairs.map((pair) => db.doc(`demandCounters/${pair.id}`));
    // All reads before any write (Firestore transactions).
    const [city, ...counters] = await tx.getAll(cityRef, ...counterRefs);
    const position = Number(city?.get('counters.waitlist') ?? 0) + 1;

    tx.update(entryRef, {
      status: 'CONFIRMED' satisfies WaitlistStatus,
      confirmedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (city?.exists) tx.update(cityRef, { 'counters.waitlist': position });

    pairs.forEach((pair, index) => {
      const count = Number(counters[index]?.get('count') ?? 0) + 1;
      const counterRef = counterRefs[index];
      if (!counterRef) return;
      tx.set(counterRef, { ...pair, count, updatedAt: FieldValue.serverTimestamp() });
      // FR-18 — the public projection only exists once the pair reaches P-18.
      if (count >= params.demandCounterMin) {
        const { id, ...stat } = pair;
        tx.set(db.doc(`demandStats/${id}`), {
          ...stat,
          count,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    });

    return { cityId, position };
  });
}
