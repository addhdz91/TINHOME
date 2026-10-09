import { describe, expect, it, vi } from 'vitest';
import { PARAM_DEFAULTS } from '@tinhome/shared/constants';
import { fixedClock } from './clock.js';
import { createParamsReader, PARAMS_CACHE_MS } from './params.js';

vi.mock('firebase-functions/logger', () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

describe('createParamsReader', () => {
  it('falls back to the defaults when the document does not exist', async () => {
    const reader = createParamsReader(
      async () => undefined,
      fixedClock('2027-03-01T10:00:00+01:00'),
    );
    expect(await reader.get()).toEqual(PARAM_DEFAULTS);
  });

  it('overrides defaults with stored values', async () => {
    const reader = createParamsReader(
      async () => ({ freeDailyLikes: 15 }),
      fixedClock('2027-03-01T10:00:00+01:00'),
    );
    expect((await reader.get()).freeDailyLikes).toBe(15);
  });

  it('ignores an invalid document', async () => {
    const reader = createParamsReader(
      async () => ({ freeDailyLikes: -1 }),
      fixedClock('2027-03-01T10:00:00+01:00'),
    );
    expect((await reader.get()).freeDailyLikes).toBe(PARAM_DEFAULTS.freeDailyLikes);
  });

  it('caches for 60 s and reloads afterwards or when invalidated', async () => {
    let now = new Date('2027-03-01T10:00:00+01:00');
    const loader = vi.fn(async () => ({ freeDailyLikes: 12 }));
    const reader = createParamsReader(loader, { now: () => now });

    await reader.get();
    await reader.get();
    expect(loader).toHaveBeenCalledTimes(1);

    now = new Date(now.getTime() + PARAMS_CACHE_MS + 1);
    await reader.get();
    expect(loader).toHaveBeenCalledTimes(2);

    reader.invalidate();
    await reader.get();
    expect(loader).toHaveBeenCalledTimes(3);
  });
});
