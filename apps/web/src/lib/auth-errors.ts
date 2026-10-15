/** Firebase Auth error codes shown to users, mapped to `authErrors.*` keys in es.json. */
const KNOWN = {
  'auth/email-already-in-use': 'emailInUse',
  'auth/invalid-credential': 'invalidCredential',
  'auth/wrong-password': 'invalidCredential',
  'auth/user-not-found': 'invalidCredential',
  'auth/invalid-email': 'invalidEmail',
  'auth/weak-password': 'weakPassword',
  'auth/password-does-not-meet-requirements': 'weakPassword',
  'auth/too-many-requests': 'tooManyRequests',
  'auth/network-request-failed': 'network',
  'auth/popup-closed-by-user': 'popupClosed',
  'auth/cancelled-popup-request': 'popupClosed',
  'auth/popup-blocked': 'popupBlocked',
  'auth/invalid-phone-number': 'invalidPhone',
  'auth/invalid-verification-code': 'invalidCode',
  'auth/code-expired': 'codeExpired',
  'auth/credential-already-in-use': 'phoneInUse',
  'auth/account-exists-with-different-credential': 'differentCredential',
  'auth/provider-already-linked': 'providerLinked',
  'auth/requires-recent-login': 'recentLogin',
  'auth/quota-exceeded': 'tooManyRequests',
} as const;

export type AuthErrorKey = (typeof KNOWN)[keyof typeof KNOWN] | 'generic';

/** Key of the message for a Firebase Auth error (never shows technical details). */
export function authErrorKey(error: unknown): AuthErrorKey {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error).code;
    if (typeof code === 'string' && code in KNOWN) return KNOWN[code as keyof typeof KNOWN];
  }
  return 'generic';
}

/** Firebase Auth code (`auth/...`) or null — AppError codes (`E_...`) are not auth errors. */
export function authErrorCode(error: unknown): string | null {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error).code;
    return typeof code === 'string' && code.startsWith('auth/') ? code : null;
  }
  return null;
}
