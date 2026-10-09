import { describe, expect, it } from 'vitest';
import { PARAM_DEFAULTS, toPublicConfig } from '../constants/params.js';
import { IsoDateSchema, PaginationInput } from './common.js';
import { ParamsSchema, PublicConfigSchema } from './config.js';

describe('ParamsSchema', () => {
  it('accepts the documented defaults', () => {
    expect(ParamsSchema.parse(PARAM_DEFAULTS)).toEqual(PARAM_DEFAULTS);
  });

  it('rejects a hamming threshold above the band index guarantee (ADR-022)', () => {
    expect(ParamsSchema.safeParse({ ...PARAM_DEFAULTS, photoDuplicateMaxHamming: 8 }).success).toBe(
      false,
    );
  });

  it('projects the public subset', () => {
    const publicConfig = toPublicConfig(PARAM_DEFAULTS);
    expect(PublicConfigSchema.parse(publicConfig)).toEqual(publicConfig);
    expect(publicConfig).not.toHaveProperty('strikesForBan');
  });
});

describe('common schemas', () => {
  it('validates ISO dates', () => {
    expect(IsoDateSchema.safeParse('2027-03-01').success).toBe(true);
    expect(IsoDateSchema.safeParse('2027-02-30').success).toBe(false);
  });

  it('defaults the page size to 20 and caps it at 50', () => {
    expect(PaginationInput.parse({})).toEqual({ limit: 20 });
    expect(PaginationInput.safeParse({ limit: 51 }).success).toBe(false);
  });
});
