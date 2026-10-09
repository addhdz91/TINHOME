import { HttpsError } from 'firebase-functions/v2/https';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { appError, toAppError } from './app-error.js';
import { parseInput } from './parse-input.js';

describe('appError', () => {
  it('maps the catalogue code to the HttpsError code and details', () => {
    const error = appError('E_LIKE_LIMIT', { meta: { resetsAt: '2027-03-02T00:00:00+01:00' } });
    expect(error).toBeInstanceOf(HttpsError);
    expect(error.code).toBe('resource-exhausted');
    expect(error.details).toEqual({
      code: 'E_LIKE_LIMIT',
      meta: { resetsAt: '2027-03-02T00:00:00+01:00' },
    });
  });

  it('turns unexpected errors into E_INTERNAL without leaking the message', () => {
    const error = toAppError(new Error('db exploded with secret'), 'req-1');
    expect(error.code).toBe('internal');
    expect(error.message).toBe('E_INTERNAL');
    expect(error.details).toEqual({ code: 'E_INTERNAL', meta: { requestId: 'req-1' } });
  });

  it('passes catalogue errors through', () => {
    const original = appError('E_NOT_FOUND');
    expect(toAppError(original, 'req-2')).toBe(original);
  });
});

describe('parseInput', () => {
  const Schema = z.object({ homeId: z.string().min(1), nights: z.number().int().max(60) });

  it('returns parsed data', () => {
    expect(parseInput(Schema, { homeId: 'h1', nights: 3 })).toEqual({ homeId: 'h1', nights: 3 });
  });

  it('throws E_VALIDATION with the invalid fields', () => {
    try {
      parseInput(Schema, { homeId: '', nights: 61 });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(HttpsError);
      expect((error as HttpsError).details).toEqual({
        code: 'E_VALIDATION',
        fields: { homeId: 'too_small', nights: 'too_big' },
      });
    }
  });

  it('reports root-level problems', () => {
    expect(() => parseInput(Schema, null)).toThrow('E_VALIDATION');
    try {
      parseInput(Schema, null);
    } catch (error) {
      expect((error as HttpsError).details).toEqual({
        code: 'E_VALIDATION',
        fields: { _root: 'invalid_type' },
      });
    }
  });
});
