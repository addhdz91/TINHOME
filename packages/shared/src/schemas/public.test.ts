import { describe, expect, it } from 'vitest';
import { CityDocSchema, WindowDocSchema } from './public.js';

describe('public document schemas', () => {
  it('accepts a seeded city and rejects an unknown status', () => {
    const city = {
      name: 'Madrid',
      province: 'Madrid',
      region: 'Comunidad de Madrid',
      timezone: 'Europe/Madrid',
      center: { lat: 40.4, lng: -3.7 },
      radiusKm: 25,
      status: 'OPEN',
      openThreshold: 150,
      counters: { visibleCandidates: 162, waitlist: 10, foundersAwarded: 0 },
      order: 1,
    };
    expect(CityDocSchema.safeParse(city).success).toBe(true);
    expect(CityDocSchema.safeParse({ ...city, status: 'SOON' }).success).toBe(false);
  });

  it('requires calendar dates in windows', () => {
    const window = {
      name: 'SS',
      startDate: '2027-03-20',
      endDate: '2027-03-28',
      active: true,
      cityIds: null,
      order: 1,
    };
    expect(WindowDocSchema.safeParse(window).success).toBe(true);
    expect(WindowDocSchema.safeParse({ ...window, endDate: '2027-02-30' }).success).toBe(false);
  });
});
