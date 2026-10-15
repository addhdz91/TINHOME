import { describe, expect, it } from 'vitest';
import { i18next } from '@/i18n';
import { AppError, toAppError, toUserMessage } from './app-error';

describe('toAppError', () => {
  it('reads the catalogue code and fields from a callable error', () => {
    const error = toAppError({
      code: 'functions/invalid-argument',
      details: { code: 'E_VALIDATION', fields: { email: 'invalid_format' } },
    });
    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe('E_VALIDATION');
    expect(error.fields).toEqual({ email: 'invalid_format' });
  });

  it('falls back to E_INTERNAL for anything else', () => {
    expect(toAppError(new Error('network')).code).toBe('E_INTERNAL');
    expect(toAppError({ details: { code: 'E_NOPE' } }).code).toBe('E_INTERNAL');
    expect(toAppError(null).code).toBe('E_INTERNAL');
  });

  it('shows the user message from es.json', () => {
    expect(toUserMessage(i18next.t, new AppError('E_TOKEN_INVALID'))).toBe(
      'El enlace no es válido o ha caducado.',
    );
  });
});
