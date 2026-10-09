import { describe, expect, it } from 'vitest';
import { ConfirmWaitlistInput, JoinWaitlistInput } from './waitlist.js';

const valid = {
  email: 'laura@demo.tinhome',
  cityId: 'madrid',
  destinations: ['valencia'],
  windowIds: ['ss27'],
  acceptPrivacy: '0.1-provisional',
};

describe('JoinWaitlistInput', () => {
  it('accepts a valid request, also without windows', () => {
    expect(JoinWaitlistInput.safeParse(valid).success).toBe(true);
    expect(JoinWaitlistInput.safeParse({ ...valid, windowIds: [] }).success).toBe(true);
  });

  it('rejects bad e-mails, no destination, duplicates and the own city', () => {
    expect(JoinWaitlistInput.safeParse({ ...valid, email: 'nope' }).success).toBe(false);
    expect(JoinWaitlistInput.safeParse({ ...valid, destinations: [] }).success).toBe(false);
    expect(
      JoinWaitlistInput.safeParse({ ...valid, destinations: ['valencia', 'valencia'] }).success,
    ).toBe(false);
    expect(JoinWaitlistInput.safeParse({ ...valid, destinations: ['madrid'] }).success).toBe(false);
    expect(JoinWaitlistInput.safeParse({ ...valid, cityId: 'Madrid!' }).success).toBe(false);
  });

  it('caps destinations at P-23', () => {
    const destinations = ['a', 'b', 'c', 'd', 'e', 'f'];
    expect(JoinWaitlistInput.safeParse({ ...valid, destinations }).success).toBe(false);
  });
});

describe('ConfirmWaitlistInput', () => {
  it('accepts url-safe tokens only', () => {
    expect(ConfirmWaitlistInput.safeParse({ token: 'a'.repeat(43) }).success).toBe(true);
    expect(ConfirmWaitlistInput.safeParse({ token: 'short' }).success).toBe(false);
    expect(ConfirmWaitlistInput.safeParse({ token: `${'a'.repeat(30)}/..` }).success).toBe(false);
  });
});
