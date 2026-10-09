import { createHash, randomBytes } from 'node:crypto';

/** Hex SHA-256 (document ids such as `waitlist/{sha256(email)}`, hashed tokens and IPs). */
export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** URL-safe random token (256 bits) for links sent by e-mail. Only its hash is stored. */
export function randomToken(): string {
  return randomBytes(32).toString('base64url');
}
