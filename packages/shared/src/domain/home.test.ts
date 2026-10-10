import { describe, expect, it } from 'vitest';
import type { IsoDate } from '../types/common.js';
import {
  isCityCandidate,
  isHomeVisible,
  isValidRange,
  missingForPublish,
  photoChangeRatio,
  visibilityProblems,
  type VisibilityContext,
} from './home.js';

const complete = {
  title: 'Piso luminoso',
  description: 'x'.repeat(60),
  cityId: 'madrid',
  zone: 'Chamberí',
  type: 'FLAT',
  tenure: 'OWNER',
  residenceUse: 'PRIMARY',
  sizeM2: 80,
  bedrooms: 0,
  beds: 2,
  bathrooms: 1,
  maxGuests: 4,
  photoCount: 5,
};

describe('BR-03 missingForPublish', () => {
  it('accepts a complete home (0 bedrooms is a valid studio)', () => {
    expect(missingForPublish(complete, 5)).toEqual([]);
  });

  it('lists missing fields and photos', () => {
    expect(missingForPublish({ ...complete, zone: '', photoCount: 4 }, 5)).toEqual([
      'zone',
      'photos',
    ]);
    expect(missingForPublish({ photoCount: 0 }, 5)).toHaveLength(13);
  });
});

const visible: VisibilityContext = {
  status: 'PUBLISHED',
  identity: 'APPROVED',
  locationCheck: 'PASS',
  onHold: false,
  ownerStatus: 'ACTIVE',
  cityStatus: 'OPEN',
};

describe('BR-04 visibility', () => {
  it('is visible only when every condition holds', () => {
    expect(isHomeVisible(visible)).toBe(true);
    expect(isHomeVisible({ ...visible, locationCheck: 'MANUAL_APPROVED' })).toBe(true);
  });

  it('explains each reason independently', () => {
    expect(visibilityProblems({ ...visible, status: 'PAUSED' })).toEqual(['NOT_PUBLISHED']);
    expect(visibilityProblems({ ...visible, identity: 'PENDING' })).toEqual(['IDENTITY']);
    expect(visibilityProblems({ ...visible, locationCheck: 'FAIL' })).toEqual(['LOCATION']);
    expect(visibilityProblems({ ...visible, onHold: true })).toEqual(['ON_HOLD']);
    expect(visibilityProblems({ ...visible, ownerStatus: 'SUSPENDED' })).toEqual(['ACCOUNT']);
    expect(visibilityProblems({ ...visible, cityStatus: 'WAITLIST' })).toEqual(['CITY']);
  });

  it('BR-21 counts published homes with approved identity as city candidates', () => {
    expect(isCityCandidate('PUBLISHED', 'APPROVED')).toBe(true);
    expect(isCityCandidate('PUBLISHED', 'PENDING')).toBe(false);
    expect(isCityCandidate('DRAFT', 'APPROVED')).toBe(false);
  });
});

describe('FR-15 ranges', () => {
  const today = '2027-03-01' as IsoDate;
  const r = (start: string, end: string) => ({ start: start as IsoDate, end: end as IsoDate });
  it('needs start < end, from today and within 12 months', () => {
    expect(isValidRange(r('2027-03-01', '2027-03-05'), today)).toBe(true);
    expect(isValidRange(r('2027-03-05', '2027-03-05'), today)).toBe(false);
    expect(isValidRange(r('2027-02-28', '2027-03-05'), today)).toBe(false);
    expect(isValidRange(r('2028-02-20', '2028-03-10'), today)).toBe(false);
  });
});

describe('FR-65 photoChangeRatio', () => {
  it('only counts the last 30 days', () => {
    const now = new Date('2027-03-01T10:00:00Z');
    const log = [
      { at: new Date('2027-02-25T10:00:00Z'), replaced: 3 },
      { at: new Date('2027-01-01T10:00:00Z'), replaced: 10 },
    ];
    expect(photoChangeRatio(log, 6, now)).toBe(0.5);
    expect(photoChangeRatio([], 0, now)).toBe(0);
  });
});
