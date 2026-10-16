import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import {
  LEGAL_DOC_SLUGS,
  MAX_AGE_YEARS,
  MIN_AGE_YEARS,
  REAUTH_MAX_AGE_SECONDS,
  SIGNUP_LEGAL_DOCS,
  type LegalAcceptanceType,
  type LegalDocSlug,
} from '@tinhome/shared/constants';
import {
  ageOn,
  generateReferralCode,
  isAdult,
  normalizeReferralCode,
  toIsoDate,
} from '@tinhome/shared/domain';
import type {
  AcceptLegalDocsInput,
  CompleteSignupInput,
  UpdateSettingsInput,
} from '@tinhome/shared/schemas';
import { appError } from '../../core/app-error.js';
import { marketingConsentRecord, prepareConsents, writeConsents } from '../../core/consent.js';
import { sha256Hex } from '../../core/crypto.js';
import { enqueueMail, enqueueMailNow } from '../../core/email/queue.js';
import { currentLegalVersions } from '../../core/legal.js';
import { publicUrl } from '../../core/public-url.js';

const REFERRAL_CODE_ATTEMPTS = 5;

/** Legal texts a user can accept from the app and the acceptance type they record. */
const ACCEPTANCE_TYPES: Partial<Record<LegalDocSlug, LegalAcceptanceType>> = {
  ...SIGNUP_LEGAL_DOCS,
  'normas-comunidad': 'COMMUNITY_RULES',
};

function displayName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName.charAt(0).toUpperCase()}.`;
}

export interface SignupSession {
  uid: string;
  email: string;
  emailVerified: boolean;
  ip: string;
  userAgent: string | null;
  /** `password`, `google.com`… (ID token `firebase.sign_in_provider`). */
  authProvider: string | null;
}

/**
 * FR-01 — creates `users`, `publicProfiles`, the Terms/Privacy acceptances, the user's own
 * referral code and, when the invitation code is valid, `referrals/{uid}` (BR-20). A waitlist
 * entry with the same e-mail is marked CONVERTED and its preferences kept for onboarding (FR-19).
 */
export async function completeSignup(
  db: Firestore,
  session: SignupSession,
  input: CompleteSignupInput,
  now: Date,
  random: () => number = Math.random,
): Promise<void> {
  const today = toIsoDate(now);
  if (ageOn(input.birthDate, today) > MAX_AGE_YEARS || input.birthDate > today) {
    throw appError('E_VALIDATION', { fields: { birthDate: 'invalid' } });
  }
  if (!isAdult(input.birthDate, today, MIN_AGE_YEARS)) throw appError('E_UNDERAGE');

  const current = await currentLegalVersions(db, Object.keys(SIGNUP_LEGAL_DOCS));
  const versionOf = (slug: string) => current.find((doc) => doc.slug === slug)?.version;
  if (
    versionOf('terminos') !== input.acceptedTerms ||
    versionOf('privacidad') !== input.acceptedPrivacy ||
    versionOf('cookies') !== input.acceptedCookies
  ) {
    throw appError('E_LEGAL_VERSION');
  }
  const accepted: Record<keyof typeof SIGNUP_LEGAL_DOCS, string> = {
    terminos: input.acceptedTerms,
    privacidad: input.acceptedPrivacy,
    cookies: input.acceptedCookies,
  };
  const consents = await prepareConsents(
    db,
    Object.entries(SIGNUP_LEGAL_DOCS).map(([slug, type]) => ({
      slug,
      type,
      version: accepted[slug as keyof typeof SIGNUP_LEGAL_DOCS],
    })),
    {
      uid: session.uid,
      email: session.email,
      source: 'SIGNUP',
      authProvider: session.authProvider,
      ip: session.ip,
      userAgent: session.userAgent,
    },
  );

  const inviteCode = input.referralCode ? normalizeReferralCode(input.referralCode) : null;
  const userRef = db.doc(`users/${session.uid}`);
  const waitlistRef = db.doc(`waitlist/${sha256Hex(session.email.trim().toLowerCase())}`);

  await db.runTransaction(async (tx) => {
    const candidates = Array.from({ length: REFERRAL_CODE_ATTEMPTS }, () =>
      generateReferralCode(random),
    );
    const [existing, waitlist, invite, ...codeSnaps] = await tx.getAll(
      userRef,
      waitlistRef,
      db.doc(`referralCodes/${inviteCode ?? '_none_'}`),
      ...candidates.map((code) => db.doc(`referralCodes/${code}`)),
    );
    if (existing?.exists) throw appError('E_ALREADY_EXISTS');
    const freeIndex = codeSnaps.findIndex((snap) => !snap.exists);
    const ownCode = candidates[freeIndex];
    if (ownCode === undefined) throw appError('E_INTERNAL');

    // AC-01.5 — a valid code is stored and never changes; an unknown code is ignored.
    const inviterUid = inviteCode && invite?.exists ? String(invite.get('uid')) : null;
    const waitlistData = waitlist?.exists ? waitlist.data() : undefined;
    const timestamp = FieldValue.serverTimestamp();

    tx.create(userRef, {
      email: session.email,
      firstName: input.firstName,
      lastName: input.lastName,
      birthDate: input.birthDate,
      status: 'ACTIVE',
      verification: {
        emailVerified: session.emailVerified,
        phoneVerified: false,
        identity: 'NONE',
      },
      onboarding: { step: 2 },
      cityId: null,
      premiumUntil: null,
      premiumSource: null,
      strikesActive: 0,
      moderationHold: null,
      foundingMember: false,
      referralCode: ownCode,
      ...(inviterUid ? { referredBy: inviterUid } : {}),
      withdrawalUsed: false,
      legal: accepted,
      settings: { theme: 'system', notifications: {} },
      ...(waitlistData
        ? {
            waitlistPrefill: {
              cityId: waitlistData.cityId as string,
              destinations: waitlistData.destinations as string[],
              windowIds: waitlistData.windowIds as string[],
            },
          }
        : {}),
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    tx.create(db.doc(`publicProfiles/${session.uid}`), {
      displayName: displayName(input.firstName, input.lastName),
      photoUrl: null,
      languages: [],
      memberSince: timestamp,
      identityVerified: false,
      foundingMember: false,
      isTopHost: false,
      reviewsCount: 0,
      active: true,
    });
    tx.create(db.doc(`referralCodes/${ownCode}`), { uid: session.uid, createdAt: timestamp });
    writeConsents(db, tx, consents);
    if (inviterUid) {
      tx.create(db.doc(`referrals/${session.uid}`), {
        inviterUid,
        inviteeUid: session.uid,
        code: inviteCode,
        status: 'REGISTERED',
        createdAt: timestamp,
      });
    }
    if (waitlistData) tx.update(waitlistRef, { status: 'CONVERTED', updatedAt: timestamp });
    enqueueMail(
      db,
      tx,
      {
        to: session.email,
        templateId: 'N-02',
        data: { firstName: input.firstName, onboardingUrl: `${publicUrl()}/app/onboarding/2` },
      },
      now,
    );
  });
}

/** updateSettings — theme (C-26), notification preferences and push preview (FR-46, FR-70). */
export async function updateSettings(
  db: Firestore,
  uid: string,
  input: UpdateSettingsInput,
  evidence: { ip: string; userAgent: string | null } = { ip: 'unknown', userAgent: null },
): Promise<void> {
  const ref = db.doc(`users/${uid}`);
  const snap = await ref.get();
  if (!snap.exists) throw appError('E_NOT_FOUND');
  const changes: Record<string, unknown> = {};
  // FR-46 — commercial e-mails: only a real change is recorded, with its evidence.
  const marketingChanged =
    input.marketingOptIn !== undefined &&
    input.marketingOptIn !== (snap.get('settings.marketingOptIn') === true);
  if (marketingChanged) {
    changes['settings.marketingOptIn'] = input.marketingOptIn;
    changes['settings.marketingOptInAt'] = FieldValue.serverTimestamp();
  }
  if (input.theme) changes['settings.theme'] = input.theme;
  if (input.pushPreview !== undefined) changes['settings.pushPreview'] = input.pushPreview;
  // FR-46 — one field per category and channel, so concurrent toggles do not overwrite each other.
  for (const [category, channels] of Object.entries(input.notifications ?? {})) {
    for (const [channel, enabled] of Object.entries(channels ?? {})) {
      if (enabled !== undefined) changes[`settings.notifications.${category}.${channel}`] = enabled;
    }
  }
  if (Object.keys(changes).length === 0) return;
  const batch = db.batch();
  batch.update(ref, { ...changes, updatedAt: FieldValue.serverTimestamp() });
  if (marketingChanged && input.marketingOptIn !== undefined) {
    writeConsents(db, batch, [
      marketingConsentRecord(input.marketingOptIn, {
        uid,
        email: (snap.get('email') as string | undefined) ?? null,
        ...evidence,
      }),
    ]);
  }
  await batch.commit();
}

/**
 * FR-07 — the client links the phone with Firebase Phone Auth (one number per account is
 * enforced by Auth); the server reads it from Auth, checks +34 and advances the onboarding.
 */
export async function confirmPhoneLinked(
  db: Firestore,
  uid: string,
  phoneNumber: string | undefined,
): Promise<void> {
  if (!phoneNumber) throw appError('E_PHONE_NOT_LINKED');
  if (!/^\+34[67]\d{8}$/.test(phoneNumber)) throw appError('E_PHONE_NOT_ES');
  const ref = db.doc(`users/${uid}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw appError('E_NOT_FOUND');
    const step = Number(snap.get('onboarding.step') ?? 1);
    tx.update(ref, {
      phoneE164: phoneNumber,
      'verification.phoneVerified': true,
      'onboarding.step': Math.max(step, 3),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

/** FR-58 / BR-35 — records acceptance of the current version of each legal text. */
export async function acceptLegalDocs(
  db: Firestore,
  uid: string,
  input: AcceptLegalDocsInput,
  ip: string,
  userAgent: string | null = null,
): Promise<void> {
  const known = new Set<string>(LEGAL_DOC_SLUGS);
  for (const item of input.items) {
    if (!known.has(item.slug) || !ACCEPTANCE_TYPES[item.slug as LegalDocSlug]) {
      throw appError('E_VALIDATION', { fields: { items: 'unknown_slug' } });
    }
  }
  const current = await currentLegalVersions(
    db,
    input.items.map((item) => item.slug),
  );
  for (const item of input.items) {
    if (current.find((doc) => doc.slug === item.slug)?.version !== item.version)
      throw appError('E_LEGAL_VERSION');
  }
  const ref = db.doc(`users/${uid}`);
  const user = await ref.get();
  const consents = await prepareConsents(
    db,
    input.items.map((item) => ({
      slug: item.slug,
      version: item.version,
      type: ACCEPTANCE_TYPES[item.slug as LegalDocSlug] ?? 'TERMS',
    })),
    {
      uid,
      email: (user.get('email') as string | undefined) ?? null,
      source: 'REACCEPTANCE',
      ip,
      userAgent,
    },
  );
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw appError('E_NOT_FOUND');
    const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
    for (const item of input.items) updates[`legal.${item.slug}`] = item.version;
    writeConsents(db, tx, consents);
    tx.update(ref, updates);
  });
}

/** 05 §2.1 — sensitive actions need a sign-in in the last 5 minutes (`auth_time`). */
export function requireRecentSignIn(authTimeSeconds: number | undefined, now: Date): void {
  if (
    authTimeSeconds === undefined ||
    now.getTime() / 1000 - authTimeSeconds > REAUTH_MAX_AGE_SECONDS
  ) {
    throw appError('E_REAUTH_REQUIRED');
  }
}

/** FR-71 — queues the N-27 security e-mail after revoking every session. */
export async function notifySignedOutEverywhere(
  db: Firestore,
  uid: string,
  now: Date,
): Promise<void> {
  const user = await db.doc(`users/${uid}`).get();
  const email = user.get('email') as string | undefined;
  if (!email) return;
  const when = new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Europe/Madrid',
  }).format(now);
  await enqueueMailNow(
    db,
    {
      to: email,
      templateId: 'N-27',
      data: { event: 'SIGNED_OUT_EVERYWHERE', when, helpUrl: `${publicUrl()}/ayuda` },
    },
    now,
  );
}
