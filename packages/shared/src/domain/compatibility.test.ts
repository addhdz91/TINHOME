import { describe, expect, it } from 'vitest';
import {
  computeCompatibility,
  wantsCity,
  type CandidateSide,
  type ViewerSide,
} from './compatibility.js';

const windows = new Map([
  ['ss27', { start: '2027-03-20', end: '2027-03-28' }],
  ['mayo27', { start: '2027-04-30', end: '2027-05-03' }],
]);

const viewer = (overrides: Partial<ViewerSide> = {}): ViewerSide => ({
  cityId: 'madrid',
  destinations: { mode: 'LIST', cityIds: ['valencia'] },
  availability: { windowIds: ['ss27'], ranges: [] },
  travelers: { count: 2, withPet: false },
  ...overrides,
});

const candidate = (overrides: Partial<CandidateSide> = {}): CandidateSide => ({
  cityId: 'valencia',
  destinations: { mode: 'LIST', cityIds: ['madrid'] },
  availability: { windowIds: ['ss27'], ranges: [] },
  maxGuests: 4,
  petsAllowed: false,
  ...overrides,
});

describe('wantsCity', () => {
  it('reads the list and «any open city» (never the own city)', () => {
    expect(wantsCity(candidate(), 'madrid')).toBe(true);
    expect(wantsCity(candidate(), 'malaga')).toBe(false);
    expect(
      wantsCity(candidate({ destinations: { mode: 'ANY_OPEN', cityIds: [] } }), 'malaga'),
    ).toBe(true);
    expect(
      wantsCity(candidate({ destinations: { mode: 'ANY_OPEN', cityIds: [] } }), 'valencia'),
    ).toBe(false);
    expect(wantsCity(candidate({ destinations: null }), 'madrid')).toBe(false);
  });
});

describe('computeCompatibility (01 §3 «Encaje perfecto»)', () => {
  it('is a perfect fit with mutual destinations and a shared window', () => {
    expect(computeCompatibility(viewer(), candidate(), windows)).toEqual({
      perfectFit: true,
      mutualDestination: true,
      wantsYourCity: true,
      sharedWindowIds: ['ss27'],
      overlapDays: 8,
      petsOk: true,
      capacityOk: true,
    });
  });

  it('counts overlapping nights between a window and a flexible range', () => {
    const result = computeCompatibility(
      viewer({
        availability: { windowIds: [], ranges: [{ start: '2027-03-25', end: '2027-04-02' }] },
      }),
      candidate(),
      windows,
    );
    expect(result).toMatchObject({ perfectFit: true, sharedWindowIds: [], overlapDays: 3 });
  });

  it('is not perfect without shared dates, even with mutual destinations', () => {
    const result = computeCompatibility(
      viewer(),
      candidate({ availability: { windowIds: ['mayo27'], ranges: [] } }),
      windows,
    );
    expect(result).toMatchObject({ perfectFit: false, mutualDestination: true, overlapDays: 0 });
  });

  it('is not perfect when only one side wants the other city', () => {
    const result = computeCompatibility(
      viewer({ destinations: { mode: 'LIST', cityIds: ['malaga'] } }),
      candidate(),
      windows,
    );
    expect(result).toMatchObject({
      perfectFit: false,
      wantsYourCity: true,
      mutualDestination: false,
    });
  });

  it('flags pets and capacity for the viewer’s travellers', () => {
    const result = computeCompatibility(
      viewer({ travelers: { count: 5, withPet: true } }),
      candidate({ maxGuests: 4, petsAllowed: false }),
      windows,
    );
    expect(result).toMatchObject({ petsOk: false, capacityOk: false });
  });

  it('handles a viewer without home data (no destinations or dates)', () => {
    const result = computeCompatibility(
      viewer({ destinations: null, availability: null, travelers: null }),
      candidate(),
      windows,
    );
    expect(result).toMatchObject({
      perfectFit: false,
      wantsYourCity: true,
      overlapDays: 0,
      capacityOk: true,
      petsOk: true,
    });
  });

  it('ignores unknown window ids and treats range ends as exclusive (nights)', () => {
    const result = computeCompatibility(
      viewer({
        availability: {
          windowIds: ['borrada'],
          ranges: [{ start: '2027-03-28', end: '2027-03-30' }],
        },
      }),
      candidate(),
      windows,
    );
    expect(result.overlapDays).toBe(0);
  });
});
