import { describe, expect, it } from 'vitest';
import { AppError } from './app-error';
import { authErrorCode, authErrorKey } from './auth-errors';

describe('auth errors', () => {
  it('maps Firebase Auth codes and ignores AppError codes', () => {
    expect(authErrorKey({ code: 'auth/email-already-in-use' })).toBe('emailInUse');
    expect(authErrorKey({ code: 'auth/something-new' })).toBe('generic');
    expect(authErrorCode({ code: 'auth/too-many-requests' })).toBe('auth/too-many-requests');
    expect(authErrorCode(new AppError('E_UNDERAGE'))).toBeNull();
    expect(authErrorCode('boom')).toBeNull();
  });
});
