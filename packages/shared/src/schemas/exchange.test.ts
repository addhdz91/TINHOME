import { describe, expect, it } from 'vitest';
import { CancelExchangeInput, ProposeExchangeInput } from './exchange.js';

describe('exchange schemas', () => {
  const base = {
    matchId: 'a_b',
    startDate: '2027-03-20',
    endDate: '2027-03-28',
    guests: { a: 1, b: 2 },
    pets: {},
  };

  it('treats an empty or null note as not given (the callable client sends null)', () => {
    expect(ProposeExchangeInput.parse({ ...base, note: null }).note).toBeUndefined();
    expect(ProposeExchangeInput.parse({ ...base, note: '  ' }).note).toBeUndefined();
    expect(ProposeExchangeInput.parse({ ...base, note: ' Hola ' }).note).toBe('Hola');
    expect(CancelExchangeInput.parse({ exchangeId: 'e', reason: null }).reason).toBeUndefined();
  });

  it('rejects invalid dates and guest counts', () => {
    expect(ProposeExchangeInput.safeParse({ ...base, startDate: '2027-02-30' }).success).toBe(
      false,
    );
    expect(ProposeExchangeInput.safeParse({ ...base, guests: { a: 0, b: 1 } }).success).toBe(false);
  });
});
