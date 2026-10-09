import { describe, expect, it } from 'vitest';
import { CompleteSignupInput, MeSchema, UpdateSettingsInput } from './account.js';

describe('account schemas', () => {
  it('validates the sign-up input', () => {
    const valid = {
      firstName: ' Laura ',
      lastName: 'García',
      birthDate: '1990-05-10',
      acceptedTerms: '0.1',
      acceptedPrivacy: '0.1',
    };
    expect(CompleteSignupInput.parse(valid).firstName).toBe('Laura');
    expect(CompleteSignupInput.safeParse({ ...valid, birthDate: '10/05/1990' }).success).toBe(
      false,
    );
    expect(CompleteSignupInput.safeParse({ ...valid, firstName: '' }).success).toBe(false);
  });

  it('rejects unknown settings', () => {
    expect(UpdateSettingsInput.safeParse({ theme: 'black' }).success).toBe(true);
    expect(UpdateSettingsInput.safeParse({ theme: 'sepia' }).success).toBe(false);
    expect(UpdateSettingsInput.safeParse({ admin: true }).success).toBe(false);
  });

  it('only accepts onboarding steps 1–6', () => {
    const step = MeSchema.shape.onboarding.shape.step;
    expect(step.safeParse(6).success).toBe(true);
    expect(step.safeParse(7).success).toBe(false);
  });
});
