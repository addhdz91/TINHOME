import { describe, expect, it } from 'vitest';
import { registerSchema } from './register-schema';

const now = new Date('2027-03-01T10:00:00+01:00');
const valid = {
  firstName: 'Laura',
  lastName: 'García',
  birthDate: '1990-05-10',
  email: 'laura@ejemplo.es',
  password: 'casaenruzafa7',
  referralCode: '',
  acceptTerms: true,
  acceptPrivacy: true,
  acceptCookies: true,
};

function messages(values: Record<string, unknown>, withCredentials = true): string[] {
  const result = registerSchema(now, withCredentials).safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
}

describe('registerSchema', () => {
  it('accepts a valid form', () => {
    expect(messages(valid)).toEqual([]);
  });

  it('AC-01.2 — rejects minors (birthday edge, T-D01)', () => {
    expect(messages({ ...valid, birthDate: '2009-03-02' })).toEqual(['underage']);
    expect(messages({ ...valid, birthDate: '2009-03-01' })).toEqual([]);
  });

  it('validates password policy, e-mail, code and consents', () => {
    expect(messages({ ...valid, password: 'short1' })).toEqual(['password']);
    expect(messages({ ...valid, password: 'Password123' })).toEqual(['passwordCommon']);
    expect(messages({ ...valid, email: 'nope' })).toEqual(['email']);
    expect(messages({ ...valid, referralCode: 'XX' })).toEqual(['referralCode']);
    expect(
      messages({ ...valid, acceptTerms: false, acceptPrivacy: false, acceptCookies: false }),
    ).toEqual(['terms', 'privacy', 'cookies']);
  });

  it('skips credentials when completing a Google sign-up', () => {
    expect(messages({ ...valid, email: '', password: '' }, false)).toEqual([]);
  });
});
