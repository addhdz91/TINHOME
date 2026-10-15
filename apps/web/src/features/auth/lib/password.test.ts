import { describe, expect, it } from 'vitest';
import { passwordProblem, passwordStrength } from './password';

describe('password policy (FR-71)', () => {
  it('requires 10 characters with letters and numbers and rejects common ones', () => {
    expect(passwordProblem('abc123')).toBe('length');
    expect(passwordProblem('soloLetrasAqui')).toBe('letters_numbers');
    expect(passwordProblem('12345678901')).toBe('letters_numbers');
    expect(passwordProblem('Password123')).toBe('common');
    expect(passwordProblem('casaenruzafa7')).toBeNull();
  });

  it('rates strength', () => {
    expect(passwordStrength('abc')).toBe('weak');
    expect(passwordStrength('casaenruzafa7')).toBe('medium');
    expect(passwordStrength('Casa-en-Ruzafa-2027')).toBe('strong');
  });
});
