import { Timestamp, type Firestore } from 'firebase-admin/firestore';
import {
  SIGNUP_LEGAL_DOCS,
  type AdminRole,
  type CityStatus,
  type HomeStatus,
  type IdentityStatus,
  type OnboardingStep,
  type PremiumSource,
  type ThemePreference,
  type UserStatus,
} from '@tinhome/shared/constants';
import {
  computeCityProgress,
  getLikeBlockers,
  isPremiumActive,
  likesRemainingToday,
  onboardingPercent,
  pendingLegalDocs,
  toIsoDate,
} from '@tinhome/shared/domain';
import type { Me } from '@tinhome/shared/schemas';
import type { Params } from '@tinhome/shared/types';
import { appError } from '../../core/app-error.js';
import { currentLegalVersions } from '../../core/legal.js';

export interface SessionInfo {
  uid: string;
  email: string;
  emailVerified: boolean;
  role: AdminRole | null;
}

function toDate(value: unknown): Date | null {
  return value instanceof Timestamp ? value.toDate() : null;
}

/**
 * 05 §4 — builds `Me` from `users/{uid}` plus the home, city, legal texts, like counter and
 * subscription. E-mail verification comes from the ID token (Firebase Auth is the source).
 */
export async function buildMe(
  db: Firestore,
  session: SessionInfo,
  params: Params,
  now: Date,
): Promise<Me> {
  const userSnap = await db.doc(`users/${session.uid}`).get();
  if (!userSnap.exists) throw appError('E_NOT_FOUND');
  const user = userSnap.data() ?? {};

  const [homeSnap, likeSnap, subscriptionSnap] = await db.getAll(
    db.doc(`homes/${session.uid}`),
    db.doc(`likeCounters/${session.uid}_${toIsoDate(now)}`),
    db.doc(`subscriptions/${session.uid}`),
  );
  const home = homeSnap?.exists ? (homeSnap.data() ?? {}) : null;
  const cityId =
    (home?.cityId as string | undefined) ?? (user.cityId as string | undefined) ?? null;
  const citySnap = cityId ? await db.doc(`cities/${cityId}`).get() : null;
  const city = citySnap?.exists ? (citySnap.data() ?? {}) : null;

  const accepted = (user.legal ?? {}) as Record<string, string>;
  const legalPending = pendingLegalDocs(
    accepted,
    await currentLegalVersions(db, Object.keys(SIGNUP_LEGAL_DOCS)),
  );

  const verification = (user.verification ?? {}) as {
    phoneVerified?: boolean;
    identity?: IdentityStatus;
  };
  const identity = verification.identity ?? 'NONE';
  const step = ((user.onboarding as { step?: number } | undefined)?.step ?? 1) as OnboardingStep;
  const completed =
    toDate((user.onboarding as { completedAt?: unknown } | undefined)?.completedAt) !== null;
  const premiumUntil = toDate(user.premiumUntil);
  const premiumActive = isPremiumActive(premiumUntil, now);
  const likes = likesRemainingToday({
    isPremium: premiumActive,
    usedToday: Number(likeSnap?.get('count') ?? 0),
    freeDailyLikes: params.freeDailyLikes,
    now,
  });
  const hold = user.moderationHold as { active?: boolean } | null | undefined;

  const blockers = getLikeBlockers({
    status: user.status as UserStatus,
    onHold: hold?.active === true,
    emailVerified: session.emailVerified,
    phoneVerified: verification.phoneVerified === true,
    identity,
    home: home
      ? {
          status: home.status as HomeStatus,
          // Completeness and availability are computed by the home module (M3).
          complete: home.complete === true,
          declarationAccepted: home.declaration !== undefined,
          hasAvailability:
            ((home.availability as { windowIds?: string[]; ranges?: unknown[] } | undefined)
              ?.windowIds?.length ?? 0) +
              ((home.availability as { ranges?: unknown[] } | undefined)?.ranges?.length ?? 0) >
            0,
        }
      : null,
    cityStatus: (city?.status as CityStatus | undefined) ?? null,
    legalUpToDate: legalPending.length === 0,
  });

  const subscription = subscriptionSnap?.exists ? (subscriptionSnap.data() ?? {}) : null;
  const firstSubscribedAt = toDate(user.firstSubscribedAt);
  const withdrawalOpen =
    firstSubscribedAt !== null &&
    now.getTime() - firstSubscribedAt.getTime() <= params.withdrawalDays * 86_400_000;
  const progress = city
    ? computeCityProgress(
        (city.counters as { visibleCandidates?: number } | undefined)?.visibleCandidates ?? 0,
        typeof city.openThreshold === 'number' ? city.openThreshold : params.cityOpenThreshold,
      )
    : null;

  return {
    uid: session.uid,
    email: session.email,
    firstName: String(user.firstName ?? ''),
    status: user.status as UserStatus,
    verification: {
      emailVerified: session.emailVerified,
      phoneVerified: verification.phoneVerified === true,
      identity,
    },
    onboarding: { step, completed, percent: onboardingPercent(step, completed) },
    home: home
      ? {
          id: session.uid,
          status: home.status as HomeStatus,
          visible: home.visible === true,
          cityId: (home.cityId as string | undefined) ?? null,
        }
      : null,
    city:
      cityId && city && progress
        ? {
            id: cityId,
            name: String(city.name ?? ''),
            status: city.status as CityStatus,
            progress: { count: progress.count, threshold: progress.threshold },
          }
        : null,
    premium: {
      active: premiumActive,
      until: premiumActive && premiumUntil ? premiumUntil.toISOString() : null,
      source: premiumActive
        ? ((user.premiumSource as PremiumSource | null | undefined) ?? null)
        : null,
      plan: (subscription?.plan as 'MONTHLY' | 'YEARLY' | undefined) ?? null,
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd === true,
      canWithdraw: withdrawalOpen && user.withdrawalUsed !== true,
    },
    likes: { remainingToday: likes.remainingToday, resetsAt: likes.resetsAt.toISOString() },
    canLike: blockers.length === 0,
    blockers,
    legalPending,
    foundingMember: user.foundingMember === true,
    referralCode: String(user.referralCode ?? ''),
    roles: session.role ? [session.role] : [],
    settings: {
      theme: (user.settings as { theme?: ThemePreference } | undefined)?.theme ?? 'system',
    },
  };
}
