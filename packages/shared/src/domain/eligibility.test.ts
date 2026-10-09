import { describe, expect, it } from 'vitest';
import { BLOCKERS } from '../constants/enums.js';
import { getLikeBlockers, type LikeContext } from './eligibility.js';

const ready: LikeContext = {
  status: 'ACTIVE',
  onHold: false,
  emailVerified: true,
  phoneVerified: true,
  identity: 'APPROVED',
  home: { status: 'PUBLISHED', complete: true, declarationAccepted: true, hasAvailability: true },
  cityStatus: 'OPEN',
  legalUpToDate: true,
};

describe('T-D02 · BR-05 getLikeBlockers', () => {
  it('returns nothing when every requirement is met', () => {
    expect(getLikeBlockers(ready)).toEqual([]);
  });

  it.each<[Partial<LikeContext>, string]>([
    [{ status: 'SUSPENDED' }, 'ACCOUNT_RESTRICTED'],
    [{ onHold: true }, 'ACCOUNT_RESTRICTED'],
    [{ emailVerified: false }, 'EMAIL'],
    [{ phoneVerified: false }, 'PHONE'],
    [{ identity: 'NONE' }, 'IDENTITY_MISSING'],
    [{ identity: 'PENDING' }, 'IDENTITY_PENDING'],
    [{ identity: 'INFO_REQUESTED' }, 'IDENTITY_PENDING'],
    [{ identity: 'REJECTED' }, 'IDENTITY_REJECTED'],
    [{ cityStatus: 'WAITLIST' }, 'CITY_WAITLIST'],
    [{ cityStatus: null }, 'CITY_WAITLIST'],
    [{ legalUpToDate: false }, 'LEGAL_OUTDATED'],
  ])('detects %o independently', (change, blocker) => {
    expect(getLikeBlockers({ ...ready, ...change })).toEqual([blocker]);
  });

  it('detects each home problem independently', () => {
    const home = ready.home ?? {
      status: 'PUBLISHED',
      complete: true,
      declarationAccepted: true,
      hasAvailability: true,
    };
    expect(getLikeBlockers({ ...ready, home: { ...home, complete: false } })).toEqual([
      'HOME_INCOMPLETE',
    ]);
    expect(getLikeBlockers({ ...ready, home: { ...home, hasAvailability: false } })).toEqual([
      'NO_AVAILABILITY',
    ]);
    expect(getLikeBlockers({ ...ready, home: { ...home, declarationAccepted: false } })).toEqual([
      'DECLARATION',
    ]);
    expect(getLikeBlockers({ ...ready, home: { ...home, status: 'PAUSED' } })).toEqual([
      'HOME_NOT_PUBLISHED',
    ]);
  });

  it('lists a brand-new account in resolution order', () => {
    const blockers = getLikeBlockers({
      ...ready,
      emailVerified: false,
      phoneVerified: false,
      identity: 'NONE',
      home: null,
      cityStatus: null,
    });
    expect(blockers).toEqual([
      'EMAIL',
      'PHONE',
      'HOME_INCOMPLETE',
      'NO_AVAILABILITY',
      'IDENTITY_MISSING',
      'DECLARATION',
      'HOME_NOT_PUBLISHED',
      'CITY_WAITLIST',
    ]);
    expect([...blockers]).toEqual(BLOCKERS.filter((b) => blockers.includes(b)));
  });
});
