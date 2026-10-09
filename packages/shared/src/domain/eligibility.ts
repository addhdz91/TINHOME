import {
  BLOCKERS,
  type Blocker,
  type CityStatus,
  type HomeStatus,
  type IdentityStatus,
  type UserStatus,
} from '../constants/enums.js';

export interface LikeContext {
  status: UserStatus;
  /** Account under preventive hold (BR-42). */
  onHold: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  identity: IdentityStatus;
  home: {
    status: HomeStatus;
    /** Required data and photos complete (BR-03). */
    complete: boolean;
    declarationAccepted: boolean;
    hasAvailability: boolean;
  } | null;
  cityStatus: CityStatus | null;
  legalUpToDate: boolean;
}

/**
 * BR-05 — everything that prevents liking, each blocker independently, in the order the user
 * resolves them (`BLOCKERS`). An empty list means the user can like.
 */
export function getLikeBlockers(ctx: LikeContext): Blocker[] {
  const blockers = new Set<Blocker>();
  if (ctx.status !== 'ACTIVE' || ctx.onHold) blockers.add('ACCOUNT_RESTRICTED');
  if (!ctx.emailVerified) blockers.add('EMAIL');
  if (!ctx.phoneVerified) blockers.add('PHONE');
  if (!ctx.home?.complete) blockers.add('HOME_INCOMPLETE');
  if (!ctx.home?.hasAvailability) blockers.add('NO_AVAILABILITY');
  if (ctx.identity === 'NONE') blockers.add('IDENTITY_MISSING');
  if (ctx.identity === 'PENDING' || ctx.identity === 'INFO_REQUESTED')
    blockers.add('IDENTITY_PENDING');
  if (ctx.identity === 'REJECTED') blockers.add('IDENTITY_REJECTED');
  if (!ctx.home?.declarationAccepted) blockers.add('DECLARATION');
  if (ctx.home?.status !== 'PUBLISHED') blockers.add('HOME_NOT_PUBLISHED');
  if (ctx.cityStatus !== 'OPEN') blockers.add('CITY_WAITLIST');
  if (!ctx.legalUpToDate) blockers.add('LEGAL_OUTDATED');
  return BLOCKERS.filter((blocker) => blockers.has(blocker));
}
